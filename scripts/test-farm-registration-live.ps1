param(
  [string]$BackendPath = '../../Project_BE/MyCropDiary_BE',
  [string]$BaseUrl = 'http://localhost:8080/api/v1'
)
$ErrorActionPreference = 'Stop'
$runId = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
$results = [System.Collections.Generic.List[object]]::new()
$testEmail = "farm-e2e-$runId@example.invalid"
$testUserId = $null
$createdIds = [System.Collections.Generic.List[int]]::new()
$report = [ordered]@{ runId = $runId; api = $BaseUrl; database = ''; testEmail = $testEmail; userId = $null; registrationIds = @(); farmId = $null; checks = $results; completed = $false }

function Check($Name, [bool]$Condition) {
  $results.Add(@{ check = $Name; passed = $Condition })
  Write-Output "$(if ($Condition) { 'PASS' } else { 'FAIL' }): $Name"
  if (!$Condition) { throw "Check failed: $Name" }
}
function SqlValue([string]$Query, [hashtable]$Parameters = @{}) {
  $command = $script:db.CreateCommand()
  $command.CommandText = $Query
  foreach ($key in $Parameters.Keys) { [void]$command.Parameters.AddWithValue("@$key", $Parameters[$key]) }
  try { return $command.ExecuteScalar() } finally { $command.Dispose() }
}
function Api([string]$Method, [string]$Path, $Body = $null, [string]$Token = '') {
  $request = @{ Uri = "$BaseUrl$Path"; Method = $Method; TimeoutSec = 40 }
  if ($Token) { $request.Headers = @{ Authorization = "Bearer $Token" } }
  if ($null -ne $Body) {
    $request.ContentType = 'application/json; charset=utf-8'
    $request.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 8))
  }
  $response = Invoke-RestMethod @request
  if (!$response.success) { throw "API failed: $Method $Path : $($response.message)" }
  return $response.data
}
function Registration($Name, $Description) {
  return Api POST '/farm-registrations' @{
    farmName = "$Name $runId"; addressLine = '123 Test Street'; province = 'Test Province'
    district = 'Test District'; ward = 'Test Ward'; description = $Description
    documentUrl = "https://example.invalid/evidence/$runId.pdf"
  } $script:userToken
}
function Snapshot([int]$Id) {
  $json = SqlValue 'SELECT registration_id, registration_note, rejection_reason, registration_status, resulting_farm_id FROM dbo.FarmRegistration WHERE registration_id = @id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER' @{ id = $Id }
  return $json | ConvertFrom-Json
}
function ExpectDenied($Name, $Method, $Path, $Body, $Token, [int[]]$Statuses) {
  $status = 200
  try { $null = Api $Method $Path $Body $Token }
  catch {
    if (!$_.Exception.Response) { throw }
    $status = [int]$_.Exception.Response.StatusCode
  }
  Check $Name ($Statuses -contains $status)
}

$settings = @{}
Get-Content -LiteralPath "$BackendPath/.env" | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $settings[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'") }
}
$jdbc = $settings['DB_URL']
if (!$jdbc) { $jdbc = 'jdbc:sqlserver://localhost:1433;databaseName=MyCropDiary' }
$builder = [System.Data.SqlClient.SqlConnectionStringBuilder]::new()
$builder['Data Source'] = [regex]::Match($jdbc, 'jdbc:sqlserver://([^;]+)').Groups[1].Value.Replace(':', ',')
$builder['Initial Catalog'] = [regex]::Match($jdbc, 'databaseName=([^;]+)').Groups[1].Value
$builder['User ID'] = $settings['DB_USERNAME']
if (!$settings['DB_USERNAME']) { $builder['User ID'] = 'sa' }
$builder['Password'] = $settings['DB_PASSWORD']
$builder['TrustServerCertificate'] = $true
$builder['Connect Timeout'] = 8
$db = [System.Data.SqlClient.SqlConnection]::new($builder.ConnectionString)
try {
  $db.Open()
  $report.database = SqlValue 'SELECT DB_NAME()'
  Check 'SQL Server has the separate rejection_reason column' ((SqlValue "SELECT COL_LENGTH('dbo.FarmRegistration','rejection_reason')") -eq 2000)
  $seedScript = Get-Content -Raw -LiteralPath "$BackendPath/MyCropDiary_SQLServer.sql"
  $seedPassword = [regex]::Match($seedScript, 'Default login password for all accounts:\s*([^\r\n]+)').Groups[1].Value.Trim()
  if (!$seedPassword) { throw 'No documented seed password found.' }
  $admin = Api POST '/auth/login' @{ email = 'admin@cropdiary.com'; password = $seedPassword }
  Check 'Admin authenticates through the real login API' ($admin.systemRole -ieq 'admin')
  $adminToken = $admin.accessToken

  # Only insert an isolated USER fixture. Existing account roles and passwords are unchanged.
  $testUserId = [int](SqlValue "INSERT INTO dbo.[User] (full_name, email, password_hash, system_role, account_status, email_verified_at) OUTPUT INSERTED.user_id SELECT @name, @email, password_hash, 'user', 'active', SYSUTCDATETIME() FROM dbo.[User] WHERE user_id = @seedId" @{ name = "E2E Farm Registration $runId"; email = $testEmail; seedId = [int]$admin.userId })
  $report.userId = $testUserId
  $user = Api POST '/auth/login' @{ email = $testEmail; password = $seedPassword }
  $userToken = $user.accessToken
  Check 'Isolated test USER authenticates through the real login API' (($user.userId -eq $testUserId) -and ($user.systemRole -ieq 'user'))
  ExpectDenied 'USER cannot access admin registrations' GET '/admin/farm-registrations' $null $userToken @(403)

  $approvalDescription = "Original approval description $runId"
  $pending = Registration 'E2E APPROVE' $approvalDescription
  $createdIds.Add([int]$pending.registrationId)
  Check 'User submits a pending registration with all seven fields' (($pending.status -ieq 'pending') -and $pending.province -eq 'Test Province' -and $pending.district -eq 'Test District' -and $pending.ward -eq 'Test Ward' -and $pending.documentUrl -eq "https://example.invalid/evidence/$runId.pdf" -and $pending.description -eq $approvalDescription)
  $approved = Api PUT "/admin/farm-registrations/$($pending.registrationId)/handle" @{ action = 'APPROVED'; rejectionReason = $null } $adminToken
  $approvedDb = Snapshot $pending.registrationId
  $report.farmId = $approvedDb.resulting_farm_id
  Check 'Admin approval persists an approved registration and resulting farm in SQL Server' (($approved.status -ieq 'approved') -and ($approvedDb.registration_status -eq 'approved') -and ($approvedDb.resulting_farm_id -gt 0))
  $farmId = [int]$approvedDb.resulting_farm_id
  $ownerCount = SqlValue "SELECT COUNT(*) FROM dbo.FarmMember WHERE farm_id = @farm AND user_id = @user AND member_role = 'owner' AND membership_status = 'active'" @{ farm = $farmId; user = $testUserId }
  Check 'SQL Server contains an active OWNER membership for the applicant' ($ownerCount -eq 1)
  $farm = Api GET "/farms/$farmId" $null $userToken
  Check 'The same USER token can access the approved farm as OWNER' (($farm.currentUserRole -ieq 'OWNER') -and ($farm.status -ieq 'ACTIVE') -and $farm.description -eq $approvalDescription)
  $farms = Api GET '/farms?page=0&size=100' $null $userToken
  Check 'Farm selector API returns the new farm with OWNER role' (@($farms.items | Where-Object { $_.id -eq $farmId -and $_.currentUserRole -ieq 'OWNER' }).Count -eq 1)
  ExpectDenied 'Already approved registration cannot be handled again' PUT "/admin/farm-registrations/$($pending.registrationId)/handle" @{ action = 'APPROVED'; rejectionReason = $null } $adminToken @(400,409)
  ExpectDenied 'User cannot cancel an approved registration' PATCH "/farm-registrations/$($pending.registrationId)/cancel" $null $userToken @(400,409)

  $originalDescription = "Original rejection description $runId"
  $rejectedPending = Registration 'E2E REJECT' $originalDescription
  $createdIds.Add([int]$rejectedPending.registrationId)
  ExpectDenied 'Rejection without a reason is blocked' PUT "/admin/farm-registrations/$($rejectedPending.registrationId)/handle" @{ action = 'REJECTED'; rejectionReason = '' } $adminToken @(400)
  $reason = "Separate rejection reason $runId"
  $rejected = Api PUT "/admin/farm-registrations/$($rejectedPending.registrationId)/handle" @{ action = 'REJECTED'; rejectionReason = $reason } $adminToken
  Check 'Rejection response preserves description separately from rejectionReason' (($rejected.status -ieq 'rejected') -and $rejected.description -eq $originalDescription -and $rejected.rejectionReason -eq $reason)
  $rejectedDb = Snapshot $rejectedPending.registrationId
  Check 'SQL Server stores original description and rejection reason in separate columns' ($rejectedDb.registration_note -eq $originalDescription -and $rejectedDb.rejection_reason -eq $reason -and $null -eq $rejectedDb.resulting_farm_id)
  $userDetail = Api GET "/farm-registrations/$($rejectedPending.registrationId)" $null $userToken
  $adminDetail = Api GET "/admin/farm-registrations/$($rejectedPending.registrationId)" $null $adminToken
  Check 'Reloaded User and Admin details preserve both independent fields' ($userDetail.description -eq $originalDescription -and $adminDetail.description -eq $originalDescription -and $userDetail.rejectionReason -eq $reason -and $adminDetail.rejectionReason -eq $reason)
  $adminList = Api GET '/admin/farm-registrations?page=0&size=100&sort=id,desc' $null $adminToken
  $listed = @($adminList.items | Where-Object { $_.registrationId -eq $rejectedPending.registrationId })
  Check 'Admin list used by frontend also returns independent description and reason' ($listed.Count -eq 1 -and $listed[0].description -eq $originalDescription -and $listed[0].rejectionReason -eq $reason)

  $cancelPending = Registration 'E2E CANCEL' "Cancellation description $runId"
  $createdIds.Add([int]$cancelPending.registrationId)
  $cancelled = Api PATCH "/farm-registrations/$($cancelPending.registrationId)/cancel" $null $userToken
  Check 'User can submit a new registration after rejection and cancel it while pending' ($cancelled.status -ieq 'cancelled')
  $report.completed = $true
} catch {
  $report.error = $_.Exception.Message
  Write-Output "TEST_STOPPED: $($_.Exception.Message)"
} finally {
  $report.registrationIds = @($createdIds.ToArray())
  $db.Dispose()
  $reportDirectory = Join-Path $PSScriptRoot '../artifacts'
  [void](New-Item -ItemType Directory -Path $reportDirectory -Force)
  $reportPath = Join-Path $reportDirectory "farm-registration-live-$runId.json"
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
  Write-Output "REPORT: $reportPath"
}
if (!$report.completed) { exit 1 }

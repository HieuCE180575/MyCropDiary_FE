-- SQL Server. Select the backend database in SSMS before running this file.
-- Additive demo dataset: no DELETE, TRUNCATE, schema changes or identity reseeding.
-- Re-running the script keeps existing demo records and their original dates.
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @AnchorMonth DATE = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
-- To reproduce June-November 2026 specifically: SET @AnchorMonth = '20261101';
DECLARE @AdminUserId INT = NULL; -- Optional: set to the administrator you log in with.
IF @AdminUserId IS NULL
    SELECT TOP (1) @AdminUserId = user_id FROM dbo.[User]
    WHERE system_role = N'admin' AND account_status = N'active' ORDER BY user_id;
IF NOT EXISTS (SELECT 1 FROM dbo.[User] WHERE user_id = @AdminUserId AND system_role = N'admin' AND account_status = N'active')
    THROW 51000, N'Can mot tai khoan admin dang hoat dong. Dien @AdminUserId hoac tao admin qua ung dung truoc.', 1;

BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @LockResult INT;
    EXEC @LockResult = sys.sp_getapplock @Resource = N'MyCropDiary.statistics.demo.v1', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0 THROW 51001, N'Khong lay duoc khoa seed. Hay thu lai.', 1;

    -- 1. Nine distinct users. Monthly new accounts: 1,2,1,3,1,1.
    -- The existing administrator and any previous users are NOT replaced.
    -- Hash copied from the backend's existing demonstration seed; login is not needed for analytics.
    DECLARE @DemoHash NVARCHAR(MAX) = N'$2a$10$8jIMVzui5SoBFkUR1udxQO3Nqp09gvVoXobsoScb/zlisb4JIieDC';
    DECLARE @Users TABLE (seq INT PRIMARY KEY, full_name NVARCHAR(150), email NVARCHAR(255), month_offset INT, account_status NVARCHAR(20), user_id INT);
    INSERT INTO @Users (seq, full_name, email, month_offset, account_status) VALUES
      (1, N'Nguyễn Văn An', N'stats.demo.01@example.test', -5, N'active'),
      (2, N'Trần Thị Bình', N'stats.demo.02@example.test', -4, N'active'),
      (3, N'Lê Quốc Huy', N'stats.demo.03@example.test', -4, N'active'),
      (4, N'Phạm Minh Châu', N'stats.demo.04@example.test', -3, N'active'),
      (5, N'Hoàng Văn Dũng', N'stats.demo.05@example.test', -2, N'active'),
      (6, N'Võ Thị Hà', N'stats.demo.06@example.test', -2, N'active'),
      (7, N'Đặng Ngọc Lan', N'stats.demo.07@example.test', -2, N'active'),
      (8, N'Bùi Thanh Nam', N'stats.demo.08@example.test', -1, N'active'),
      (9, N'Đỗ Minh Tâm', N'stats.demo.09@example.test', 0, N'pending');
    INSERT INTO dbo.[User] (full_name, email, phone, password_hash, system_role, account_status, email_verified_at, created_at, updated_at)
    SELECT s.full_name, s.email, N'090900000' + CONVERT(NVARCHAR(1), s.seq), @DemoHash, N'user', s.account_status,
      CASE WHEN s.account_status = N'active' THEN DATEADD(MONTH, s.month_offset, @AnchorMonth) END,
      DATEADD(MONTH, s.month_offset, @AnchorMonth), DATEADD(MONTH, s.month_offset, @AnchorMonth)
    FROM @Users s WHERE NOT EXISTS (SELECT 1 FROM dbo.[User] u WHERE u.email = s.email);
    UPDATE s SET user_id = u.user_id FROM @Users s JOIN dbo.[User] u ON u.email = s.email;

    -- 2. Three farms, four zones, six plots; 2.8 ha in total.
    DECLARE @Farms TABLE (seq INT PRIMARY KEY, farm_name NVARCHAR(160), marker NVARCHAR(100), owner_seq INT, status NVARCHAR(20), month_offset INT, farm_id INT);
    INSERT INTO @Farms (seq, farm_name, marker, owner_seq, status, month_offset) VALUES
      (1, N'Trang trại An Phú [TK mẫu]', N'STAT-DEMO-V1-FARM-01', 1, N'active', -5),
      (2, N'Trang trại Hải Bình [TK mẫu]', N'STAT-DEMO-V1-FARM-02', 2, N'active', -4),
      (3, N'Trang trại Minh Tâm [TK mẫu]', N'STAT-DEMO-V1-FARM-03', 3, N'inactive', -1);
    INSERT INTO dbo.Farm (farm_name, description, address, created_by, farm_status, created_at, updated_at)
    SELECT s.farm_name, s.marker, N'Khu sản xuất mẫu phục vụ thống kê', u.user_id, s.status,
      DATEADD(DAY,1,DATEADD(MONTH, s.month_offset, @AnchorMonth)), DATEADD(DAY,1,DATEADD(MONTH, s.month_offset, @AnchorMonth))
    FROM @Farms s JOIN @Users u ON u.seq = s.owner_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Farm f WHERE f.description = s.marker);
    UPDATE s SET farm_id = f.farm_id FROM @Farms s JOIN dbo.Farm f ON f.description = s.marker;

    DECLARE @Members TABLE (farm_seq INT, user_seq INT, role NVARCHAR(30));
    INSERT INTO @Members VALUES (1,1,N'owner'), (2,2,N'owner'), (3,3,N'owner'), (1,4,N'member'), (2,5,N'member');
    INSERT INTO dbo.FarmMember (farm_id, user_id, member_role, membership_status, joined_at)
    SELECT f.farm_id, u.user_id, m.role, N'active',
      CASE WHEN u.month_offset > f.month_offset THEN DATEADD(MONTH,u.month_offset,@AnchorMonth) ELSE DATEADD(DAY,1,DATEADD(MONTH,f.month_offset,@AnchorMonth)) END
    FROM @Members m JOIN @Farms f ON f.seq = m.farm_seq JOIN @Users u ON u.seq = m.user_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.FarmMember x WHERE x.farm_id = f.farm_id AND x.user_id = u.user_id);
    INSERT INTO dbo.FarmWorker (farm_member_id, worker_code, job_title, employment_status, hired_at)
    SELECT m.farm_member_id, N'STAT-DEMO-' + CONVERT(NVARCHAR(12), m.farm_member_id), N'Nhân sự kỹ thuật', N'active', DATEADD(MONTH,-2,@AnchorMonth)
    FROM dbo.FarmMember m JOIN @Farms f ON f.farm_id = m.farm_id JOIN @Users u ON u.user_id = m.user_id
    WHERE u.seq IN (4,5) AND NOT EXISTS (SELECT 1 FROM dbo.FarmWorker w WHERE w.farm_member_id = m.farm_member_id);

    DECLARE @Zones TABLE (seq INT PRIMARY KEY, farm_seq INT, name NVARCHAR(120), area NUMERIC(12,2), zone_id INT);
    INSERT INTO @Zones (seq, farm_seq, name, area) VALUES
      (1,1,N'Vùng trồng 1 [TK mẫu]',1.00), (2,1,N'Vùng trồng 2 [TK mẫu]',0.80),
      (3,2,N'Vùng trồng 3 [TK mẫu]',0.60), (4,3,N'Vùng trồng 4 [TK mẫu]',0.40);
    INSERT INTO dbo.Zone (farm_id, zone_name, description, area_value, area_unit, created_at)
    SELECT f.farm_id, z.name, N'STAT-DEMO-V1', z.area, N'ha', DATEADD(DAY,1,DATEADD(MONTH, f.month_offset, @AnchorMonth))
    FROM @Zones z JOIN @Farms f ON f.seq = z.farm_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Zone x WHERE x.farm_id = f.farm_id AND x.zone_name = z.name);
    UPDATE z SET zone_id = x.zone_id FROM @Zones z JOIN @Farms f ON f.seq = z.farm_seq JOIN dbo.Zone x ON x.farm_id = f.farm_id AND x.zone_name = z.name;
    DECLARE @Blocks TABLE (seq INT PRIMARY KEY, zone_seq INT, name NVARCHAR(120), area NUMERIC(12,2), block_id INT);
    INSERT INTO @Blocks (seq, zone_seq, name, area) VALUES
      (1,1,N'Lô A1 [TK mẫu]',0.50), (2,1,N'Lô A2 [TK mẫu]',0.50), (3,2,N'Lô A3 [TK mẫu]',0.80),
      (4,3,N'Lô B1 [TK mẫu]',0.30), (5,3,N'Lô B2 [TK mẫu]',0.30), (6,4,N'Lô C1 [TK mẫu]',0.40);
    INSERT INTO dbo.Block (zone_id, block_name, description, area_value, area_unit, soil_type, created_at)
    SELECT z.zone_id, b.name, N'STAT-DEMO-V1', b.area, N'ha', N'Đất thịt', DATEADD(DAY,1,DATEADD(MONTH,f.month_offset,@AnchorMonth))
    FROM @Blocks b JOIN @Zones z ON z.seq = b.zone_seq JOIN @Farms f ON f.seq=z.farm_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Block x WHERE x.zone_id = z.zone_id AND x.block_name = b.name);
    UPDATE b SET block_id = x.block_id FROM @Blocks b JOIN @Zones z ON z.seq = b.zone_seq JOIN dbo.Block x ON x.zone_id = z.zone_id AND x.block_name = b.name;

    -- 3. Two mango, one tomato, one pepper season. Two growing, two harvested.
    DECLARE @Crops TABLE (seq INT PRIMARY KEY, name NVARCHAR(100), crop_id INT);
    INSERT INTO @Crops (seq,name) VALUES (1,N'Xoài'),(2,N'Cà chua'),(3,N'Ớt chuông');
    INSERT INTO dbo.CropCategory (category_name, description, created_at)
    SELECT name,N'Danh mục cây trồng dùng cho dữ liệu thống kê mẫu',DATEADD(MONTH,-5,@AnchorMonth)
    FROM @Crops s WHERE NOT EXISTS (SELECT 1 FROM dbo.CropCategory c WHERE c.category_name = s.name);
    UPDATE s SET crop_id = c.crop_category_id FROM @Crops s JOIN dbo.CropCategory c ON c.category_name = s.name;
    DECLARE @Seasons TABLE (seq INT PRIMARY KEY, farm_seq INT, crop_seq INT, block_seq INT, name NVARCHAR(120), status NVARCHAR(20), month_offset INT, season_id INT);
    INSERT INTO @Seasons (seq,farm_seq,crop_seq,block_seq,name,status,month_offset) VALUES
      (1,1,1,1,N'Mùa vụ Xoài vụ 1 [TK mẫu]',N'active',-2),
      (2,1,1,3,N'Mùa vụ Xoài vụ 2 [TK mẫu]',N'completed',-5),
      (3,2,2,4,N'Mùa vụ Cà chua nhà kính [TK mẫu]',N'completed',-4),
      (4,2,3,5,N'Mùa vụ Ớt chuông [TK mẫu]',N'active',-1);
    INSERT INTO dbo.CropSeason (farm_id,crop_category_id,season_name,start_date,end_date,season_status,notes,created_by,created_at)
    SELECT f.farm_id,c.crop_id,s.name,DATEADD(DAY,2,DATEADD(MONTH,s.month_offset,@AnchorMonth)),DATEADD(DAY,2,DATEADD(MONTH,s.month_offset+3,@AnchorMonth)),s.status,N'STAT-DEMO-V1',u.user_id,DATEADD(DAY,2,DATEADD(MONTH,s.month_offset,@AnchorMonth))
    FROM @Seasons s JOIN @Farms f ON f.seq=s.farm_seq JOIN @Crops c ON c.seq=s.crop_seq JOIN @Users u ON u.seq=f.owner_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.CropSeason x WHERE x.farm_id=f.farm_id AND x.season_name=s.name);
    UPDATE s SET season_id=x.crop_season_id FROM @Seasons s JOIN @Farms f ON f.seq=s.farm_seq JOIN dbo.CropSeason x ON x.farm_id=f.farm_id AND x.season_name=s.name;
    INSERT INTO dbo.CropSeasonBlock (crop_season_id,block_id,planted_area,area_unit,planted_at,expected_harvest_at)
    SELECT s.season_id,b.block_id,b.area,N'ha',DATEADD(DAY,2,DATEADD(MONTH,s.month_offset,@AnchorMonth)),DATEADD(DAY,2,DATEADD(MONTH,s.month_offset+3,@AnchorMonth))
    FROM @Seasons s JOIN @Blocks b ON b.seq=s.block_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.CropSeasonBlock x WHERE x.crop_season_id=s.season_id AND x.block_id=b.block_id);

    -- 4. Four applications distributed over time, including two correctly linked approvals.
    DECLARE @Registrations TABLE (seq INT PRIMARY KEY, user_seq INT, farm_seq INT NULL, farm_name NVARCHAR(160), status NVARCHAR(20), month_offset INT);
    INSERT INTO @Registrations VALUES
      (1,1,1,N'Trang trại An Phú [TK mẫu]',N'approved',-5),
      (2,2,2,N'Trang trại Hải Bình [TK mẫu]',N'approved',-4),
      (3,6,NULL,N'Trang trại Gia Bảo [TK mẫu]',N'pending',0),
      (4,7,NULL,N'Trang trại Quang Huy [TK mẫu]',N'rejected',-1);
    INSERT INTO dbo.FarmRegistration (user_id,farm_name,address,province,registration_note,registration_status,reviewed_by,reviewed_at,resulting_farm_id,rejection_reason,created_at)
    SELECT u.user_id,r.farm_name,N'Địa chỉ trang trại mẫu',N'Đồng Tháp',N'STAT-DEMO-V1',r.status,
      CASE WHEN r.status<>N'pending' THEN @AdminUserId END,
      CASE WHEN r.status<>N'pending' THEN DATEADD(DAY,1,DATEADD(MONTH,r.month_offset,@AnchorMonth)) END,
      f.farm_id,CASE WHEN r.status=N'rejected' THEN N'Thiếu thông tin nguồn nước và lô đất' END,DATEADD(MONTH,r.month_offset,@AnchorMonth)
    FROM @Registrations r JOIN @Users u ON u.seq=r.user_seq LEFT JOIN @Farms f ON f.seq=r.farm_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.FarmRegistration x WHERE x.user_id=u.user_id AND x.farm_name=r.farm_name AND x.registration_note=N'STAT-DEMO-V1');

    -- 5. Twelve expenses, total VND 199,700,000; monthly 0/35/28.5/42/58.2/36 million.
    DECLARE @Expenses TABLE (seq INT PRIMARY KEY,farm_seq INT,category NVARCHAR(80),amount NUMERIC(14,2),month_offset INT,description NVARCHAR(200));
    INSERT INTO @Expenses VALUES
      (1,1,N'MATERIAL',20000000,-4,N'[STAT-DEMO-V1-EXP-01] Phân bón NPK'),
      (2,2,N'LABOR',15000000,-4,N'[STAT-DEMO-V1-EXP-02] Chăm sóc cây'),
      (3,1,N'MATERIAL',15000000,-3,N'[STAT-DEMO-V1-EXP-03] Giống cây và phân bón'),
      (4,2,N'EQUIPMENT',13500000,-3,N'[STAT-DEMO-V1-EXP-04] Bảo dưỡng máy bơm'),
      (5,1,N'LABOR',20000000,-2,N'[STAT-DEMO-V1-EXP-05] Nhân công thu hoạch'),
      (6,2,N'OTHER',22000000,-2,N'[STAT-DEMO-V1-EXP-06] Vận chuyển và đóng gói'),
      (7,1,N'MATERIAL',25000000,-1,N'[STAT-DEMO-V1-EXP-07] Vật tư chăm sóc'),
      (8,2,N'LABOR',9000000,-1,N'[STAT-DEMO-V1-EXP-08] Chăm sóc nhà kính'),
      (9,2,N'EQUIPMENT',18500000,-1,N'[STAT-DEMO-V1-EXP-09] Thiết bị tưới'),
      (10,1,N'OTHER',5700000,-1,N'[STAT-DEMO-V1-EXP-10] Vận chuyển vật tư'),
      (11,1,N'MATERIAL',25000000,0,N'[STAT-DEMO-V1-EXP-11] Bổ sung phân bón'),
      (12,2,N'LABOR',11000000,0,N'[STAT-DEMO-V1-EXP-12] Nhân công chăm sóc');
    INSERT INTO dbo.Expense (farm_id,expense_category,description,amount,expense_date,recorded_by,created_at)
    SELECT f.farm_id,e.category,e.description,e.amount,DATEADD(DAY,2,DATEADD(MONTH,e.month_offset,@AnchorMonth)),m.farm_member_id,DATEADD(DAY,2,DATEADD(MONTH,e.month_offset,@AnchorMonth))
    FROM @Expenses e JOIN @Farms f ON f.seq=e.farm_seq JOIN @Users u ON u.seq=f.owner_seq
      JOIN dbo.FarmMember m ON m.farm_id=f.farm_id AND m.user_id=u.user_id
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Expense x WHERE x.farm_id=f.farm_id AND x.description=e.description);

    -- 6. Feedback in two months, rating 5/5. A reply makes the backend status RESOLVED.
    DECLARE @AI TABLE (seq INT PRIMARY KEY,user_seq INT,month_offset INT,title NVARCHAR(200),feedback NVARCHAR(MAX),conversation_id INT,message_id INT,feedback_id INT);
    INSERT INTO @AI (seq,user_seq,month_offset,title,feedback) VALUES
      (1,1,-1,N'[STAT-DEMO-V1-AI-01] Tư vấn chăm sóc xoài',N'Hướng dẫn chăm sóc và phòng bệnh cho cây xoài rất rõ ràng, áp dụng hiệu quả.'),
      (2,2,0,N'[STAT-DEMO-V1-AI-02] Tư vấn nhà kính',N'Gợi ý lịch bón phân và tưới nước cho cà chua nhà kính hữu ích, dễ thực hiện.');
    INSERT INTO dbo.AIConversation (user_id,conversation_title,conversation_status,created_at,updated_at)
    SELECT u.user_id,a.title,N'open',DATEADD(MONTH,a.month_offset,@AnchorMonth),DATEADD(MONTH,a.month_offset,@AnchorMonth)
    FROM @AI a JOIN @Users u ON u.seq=a.user_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AIConversation x WHERE x.user_id=u.user_id AND x.conversation_title=a.title);
    UPDATE a SET conversation_id=x.ai_conversation_id FROM @AI a JOIN @Users u ON u.seq=a.user_seq JOIN dbo.AIConversation x ON x.user_id=u.user_id AND x.conversation_title=a.title;
    INSERT INTO dbo.AIMessage (ai_conversation_id,sender_type,message_text,attachment_urls,created_at)
    SELECT a.conversation_id,N'assistant',N'Tư vấn mẫu phục vụ biểu đồ thống kê: theo dõi sinh trưởng, ghi nhật ký và kiểm tra điều kiện canh tác.',N'[]',DATEADD(MONTH,a.month_offset,@AnchorMonth)
    FROM @AI a WHERE NOT EXISTS (SELECT 1 FROM dbo.AIMessage x WHERE x.ai_conversation_id=a.conversation_id AND x.sender_type=N'assistant');
    UPDATE a SET message_id=x.ai_message_id FROM @AI a JOIN dbo.AIMessage x ON x.ai_conversation_id=a.conversation_id AND x.sender_type=N'assistant';
    INSERT INTO dbo.AIFeedback (ai_message_id,user_id,rating,feedback_text,created_at)
    SELECT a.message_id,u.user_id,5,a.feedback,DATEADD(MONTH,a.month_offset,@AnchorMonth)
    FROM @AI a JOIN @Users u ON u.seq=a.user_seq
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AIFeedback x WHERE x.ai_message_id=a.message_id AND x.user_id=u.user_id);
    UPDATE a SET feedback_id=x.ai_feedback_id FROM @AI a JOIN @Users u ON u.seq=a.user_seq JOIN dbo.AIFeedback x ON x.ai_message_id=a.message_id AND x.user_id=u.user_id;
    INSERT INTO dbo.AIFeedbackReply (ai_feedback_id,user_id,reply_text,created_at)
    SELECT a.feedback_id,@AdminUserId,N'Cảm ơn bạn đã phản hồi. Nội dung tư vấn đã được kiểm tra và ghi nhận.',DATEADD(DAY,1,DATEADD(MONTH,a.month_offset,@AnchorMonth))
    FROM @AI a WHERE a.seq=1 AND NOT EXISTS (SELECT 1 FROM dbo.AIFeedbackReply x WHERE x.ai_feedback_id=a.feedback_id);

    COMMIT TRANSACTION;
    SELECT N'STAT-DEMO-V1' AS dataset,DB_NAME() AS database_name,@AnchorMonth AS anchor_month,
      (SELECT COUNT(*) FROM @Users) AS demo_users,(SELECT COUNT(*) FROM @Farms) AS demo_farms,
      (SELECT COUNT(*) FROM @Zones) AS demo_zones,(SELECT COUNT(*) FROM @Blocks) AS demo_blocks,
      (SELECT COUNT(*) FROM @Seasons) AS demo_seasons,(SELECT COUNT(*) FROM @Registrations) AS demo_applications;
    SELECT CONVERT(CHAR(7),x.expense_date,120) AS expense_month,SUM(x.amount) AS demo_expense_total
    FROM dbo.Expense x JOIN @Expenses e ON e.description=x.description JOIN @Farms f ON f.farm_id=x.farm_id
    GROUP BY CONVERT(CHAR(7),x.expense_date,120) ORDER BY expense_month;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

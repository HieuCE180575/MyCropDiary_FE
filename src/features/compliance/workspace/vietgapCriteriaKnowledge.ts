export interface VietGapCriterionKnowledge {
  ruleCode: string;
  requirement: string;
  checkpoints: string[];
  evidenceRequired: string;
  tcvnClause: string;
}

export const VIETGAP_CRITERIA_KNOWLEDGE: Record<string, VietGapCriterionKnowledge> = {
  // ─── PHẦN 1: HỒ SƠ & TẬP HUẤN ───────────────────────────
  'VG-HS-01': {
    ruleCode: 'VG-HS-01',
    requirement: 'Người quản lý trực tiếp phải có chứng chỉ tập huấn VietGAP hoặc giấy xác nhận kiến thức ATTP còn hiệu lực.',
    checkpoints: [
      'Chứng chỉ tập huấn VietGAP Trồng trọt hoặc xác nhận kiến thức ATTP còn hạn (trong vòng 03 năm kể từ ngày cấp).',
      'Người quản lý nắm vững nguyên tắc truy xuất nguồn gốc, an toàn hóa chất và ghi chép nhật ký canh tác.',
    ],
    evidenceRequired: 'Ảnh chụp bản gốc Giấy chứng nhận tập huấn VietGAP / Giấy xác nhận kiến thức ATTP.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.1.1',
  },
  'VG-HS-02': {
    ruleCode: 'VG-HS-02',
    requirement: 'Người lao động được hướng dẫn, tập huấn phù hợp với công việc đảm nhận.',
    checkpoints: [
      'Có danh sách ký nhận tham gia tập huấn vệ sinh tay, mang bảo hộ lao động của công nhân.',
      'Được hướng dẫn kỹ thuật thụ phấn, bấm ngọn, thu hái đúng quy trình vệ sinh an toàn thực phẩm.',
    ],
    evidenceRequired: 'Ảnh chụp biên bản họp/sổ ký nhận đào tạo nội bộ công nhân nông trại.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.1.2',
  },
  'VG-HS-03': {
    ruleCode: 'VG-HS-03',
    requirement: 'Người kiểm tra/đánh giá nội bộ có giấy xác nhận đã được tập huấn kỹ năng đánh giá VietGAP.',
    checkpoints: [
      'Người thực hiện thẩm định có chứng chỉ Đánh giá viên nội bộ VietGAP (Internal Auditor).',
      'Đảm bảo tính khách quan: Không tự đánh giá công việc do chính mình trực tiếp phụ trách.',
    ],
    evidenceRequired: 'Ảnh chụp chứng chỉ Đánh giá viên nội bộ VietGAP của cán bộ kiểm tra.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.1.3',
  },
  'VG-HS-04': {
    ruleCode: 'VG-HS-04',
    requirement: 'Có quy trình sản xuất nội bộ bằng văn bản phù hợp với cây trồng và điều kiện thực tế trang trại.',
    checkpoints: [
      'Có tài liệu quy trình canh tác chính thức cho từng loại cây (dưa lưới, ớt chuông, cà chua, rau màu).',
      'Quy trình nêu rõ các giai đoạn: xử lý đất/giá thể, mật độ gieo trồng, chế độ tưới, bón phân, phòng trừ sâu bệnh.',
    ],
    evidenceRequired: 'Ảnh chụp trang bìa, mục lục và quyết định ban hành quy trình sản xuất nội bộ.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.1.4',
  },
  'VG-HS-05': {
    ruleCode: 'VG-HS-05',
    requirement: 'Ghi chép nhật ký sản xuất đầy đủ, cập nhật thường xuyên ngay sau mỗi đợt canh tác.',
    checkpoints: [
      'Nhật ký điện tử ghi nhận trong ngày các hoạt động: gieo trồng, tưới nước, bón phân, phun xịt thuốc, thu hoạch.',
      'Thông tin thể hiện rõ mã lô/nhà màng (Block), loại vật tư, tên hoạt chất, liều lượng và người thực hiện.',
    ],
    evidenceRequired: 'Ảnh chụp màn hình nhật ký canh tác số trên app hoặc sổ nhật ký hiện trường.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.1.5',
  },
  'VG-HS-06': {
    ruleCode: 'VG-HS-06',
    requirement: 'Lưu trữ toàn bộ hồ sơ, hóa đơn mua vật tư, nhật ký thu hoạch tối thiểu 02 năm.',
    checkpoints: [
      'Có nơi lưu trữ hồ sơ giấy tờ (hóa đơn hạt giống, phân bón, thuốc BVTV, phiếu xét nghiệm) tối thiểu 24 tháng.',
      'Dữ liệu số hóa của các mùa vụ trước được bảo quản an toàn, sẵn sàng xuất trình khi thanh tra.',
    ],
    evidenceRequired: 'Ảnh chụp tủ lưu trữ hồ sơ giấy tờ hoặc thư mục lưu trữ số hóa của trang trại.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.1.6',
  },

  // ─── PHẦN 2: CƠ SỞ VẬT CHẤT & THIẾT BỊ ──────────────────
  'VG-CS-01': {
    ruleCode: 'VG-CS-01',
    requirement: 'Kho chứa phân bón, thuốc BVTV riêng biệt, thông thoáng, có khóa an toàn và xa nguồn nước.',
    checkpoints: [
      'Kho/tủ thuốc BVTV có khóa chắc chắn, cách xa nguồn nước sinh hoạt và mương tưới tối thiểu 10m.',
      'Có biển cảnh báo nguy hiểm "KHO THUỐC BVTV - NGUY HIỂM", có khay chống tràn hoặc sàn chống rò rỉ hóa chất.',
      'Kệ kê thuốc cách sàn tối thiểu 15cm, có bình cứu hỏa hoặc cát dập lửa.',
    ],
    evidenceRequired: 'Ảnh chụp cửa kho thuốc có khóa, biển báo cảnh báo và kệ chứa thuốc an toàn.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.2.1',
  },
  'VG-CS-02': {
    ruleCode: 'VG-CS-02',
    requirement: 'Khu vực sơ chế đóng gói sạch sẽ, thông thoáng, ngăn chặn được côn trùng và động vật.',
    checkpoints: [
      'Bàn sơ chế bằng inox 304 hoặc vật liệu không gỉ, dễ cọ rửa và khử trùng.',
      'Kệ pallet để thùng nông sản cách mặt đất tối thiểu 15cm, tường và trần không đọng mạng nhện.',
      'Cửa ra vào có rèm nhựa hoặc lưới chắn côn trùng 50 mesh ngăn ruồi muỗi xâm nhập.',
    ],
    evidenceRequired: 'Ảnh chụp bàn sơ chế inox, kệ pallet cách đất ≥ 15cm và lưới chắn côn trùng.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.2.2',
  },
  'VG-CS-03': {
    ruleCode: 'VG-CS-03',
    requirement: 'Thiết bị, dụng cụ thu hoạch, kéo tỉa, sọt đựng được vệ sinh khử trùng định kỳ.',
    checkpoints: [
      'Kéo cắt cuống, sọt nhựa đựng rau quả được tẩy rửa khử trùng bằng cồn 70° hoặc Cloramin B trước đợt thu hoạch.',
      'Tuyệt đối không dùng sọt đựng nông sản vào mục đích chứa đất, phân bón hay vỏ thuốc.',
    ],
    evidenceRequired: 'Ảnh chụp sọt khay đựng nông sản sạch sẽ hoặc dung dịch sát trùng dụng cụ thu hoạch.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.2.3',
  },
  'VG-CS-04': {
    ruleCode: 'VG-CS-04',
    requirement: 'Có sơ đồ mặt bằng các phân khu, lô đất, trạm bơm tưới được cập nhật và niêm yết rõ ràng.',
    checkpoints: [
      'Bản vẽ sơ đồ thể hiện ranh giới từng nhà màng (Block), trạm bơm châm phân, kho vật tư, bể chứa vỏ thuốc.',
      'Sơ đồ được niêm yết tại văn phòng điều hành hoặc lối vào trang trại.',
    ],
    evidenceRequired: 'Ảnh chụp sơ đồ mặt bằng tổng thể nông trại niêm yết tại hiện trường.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.2.4',
  },

  // ─── PHẦN 3: NGUYÊN LIỆU ĐẦU VÀO & KIỂM NGHIỆM ──────────
  'VG-NL-01': {
    ruleCode: 'VG-NL-01',
    requirement: 'Phiếu kiểm nghiệm mẫu đất và nước tưới đạt chuẩn QCVN về giới hạn kim loại nặng và vi sinh vật.',
    checkpoints: [
      'Phiếu phân tích mẫu còn hiệu lực trong vòng 12 tháng từ phòng kiểm nghiệm đạt chuẩn ISO/IEC 17025.',
      'Ngưỡng nước tưới (QCVN 39:2011/BTNMT): pH 5.5 - 8.5; Asen (As) ≤ 0.05 mg/L; Chì (Pb) ≤ 0.05 mg/L; Cadimi (Cd) ≤ 0.01 mg/L; Thủy ngân (Hg) ≤ 0.001 mg/L; E. coli ≤ 100 MPN/100mL; Salmonella: Âm tính (KPH/250mL).',
      'Ngưỡng đất trồng (QCVN 03-MT:2015/BTNMT): Asen (As) ≤ 15 mg/kg; Cadimi (Cd) ≤ 1.5 mg/kg; Chì (Pb) ≤ 70 mg/kg; Đồng (Cu) ≤ 100 mg/kg; Kẽm (Zn) ≤ 200 mg/kg.',
    ],
    evidenceRequired: 'Ảnh chụp phiếu kết quả kiểm nghiệm đất và nước tưới có dấu đỏ của phòng thí nghiệm chỉ định.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.3.1',
  },
  'VG-NL-02': {
    ruleCode: 'VG-NL-02',
    requirement: 'Có biện pháp xử lý và giám sát khi kết quả xét nghiệm đất hoặc nước không đạt tiêu chuẩn.',
    checkpoints: [
      'Có hệ thống bồn lắng lọc cát thạch anh, than hoạt tính, hoặc khử trùng clo/ozone khi nước nhiễm khuẩn.',
      'Có quy trình rải vôi bột (CaCO3) nâng độ pH đất hoặc sấy khử trùng giá thể xơ dừa trước khi gieo.',
    ],
    evidenceRequired: 'Ảnh chụp hệ thống bồn lọc nước hoặc nhật ký xử lý cải tạo đất/giá thể.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.3.2',
  },
  'VG-NL-03': {
    ruleCode: 'VG-NL-03',
    requirement: 'Giống cây trồng có nguồn gốc xuất xứ rõ ràng, có hóa đơn và hồ sơ chứng nhận chất lượng.',
    checkpoints: [
      'Hạt giống lai F1 có hóa đơn GTGT, bao bì ghi rõ nguồn gốc xuất xứ từ đơn vị cung ứng có phép.',
      'Tỷ lệ nảy mầm đạt ≥ 85%, độ thuần giống ≥ 98% theo tiêu chuẩn công bố của nhà sản xuất giống.',
    ],
    evidenceRequired: 'Ảnh chụp bao bì nhãn mác hạt giống và hóa đơn mua hàng từ nhà cung cấp uy tín.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.3.3',
  },
  'VG-NL-04': {
    ruleCode: 'VG-NL-04',
    requirement: 'Sử dụng giống khỏe mạnh, sạch sâu bệnh hại, không sử dụng giống biến đổi gen chưa cấp phép.',
    checkpoints: [
      'Cây con ươm khỏe, chiều cao đồng đều, thân mập, bộ rễ trắng khỏe, không có vết nấm hay sâu bệnh.',
      'Tuyệt đối không sử dụng các giống biến đổi gen (GMO) ngoài danh mục cấp phép của Bộ NN&PTNT.',
    ],
    evidenceRequired: 'Ảnh chụp khay cây giống ươm khỏe mạnh trong vườn ươm trước khi xuất vườn.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.3.4',
  },

  // ─── PHẦN 4: QUẢN LÝ PHÂN BÓN & THUỐC BVTV ───────────────
  'VG-PB-01': {
    ruleCode: 'VG-PB-01',
    requirement: 'Chỉ sử dụng phân bón trong Danh mục được phép lưu hành tại Việt Nam, nhãn mác rõ ràng.',
    checkpoints: [
      'Phân bón hòa tan Fertigation (NPK, Canxi Nitrat, Magie Sunfat) có mã số phân bón lưu hành do Cục Trồng trọt cấp.',
      'Bao bì còn nguyên tem nhãn, hạn sử dụng, không dùng phân trôi nổi hoặc hết hạn.',
    ],
    evidenceRequired: 'Ảnh chụp bao bì tem nhãn phân bón thể hiện rõ mã số lưu hành và thành phần.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.4.1',
  },
  'VG-PB-02': {
    ruleCode: 'VG-PB-02',
    requirement: 'Phân chuồng hữu cơ phải được ủ hoai mục vi sinh đạt chuẩn, tuyệt đối không dùng phân tươi.',
    checkpoints: [
      'Phân chuồng được ủ vi sinh Trichoderma tối thiểu ≥ 60 ngày, nhiệt độ đống ủ đạt ≥ 50°C để diệt mầm bệnh.',
      'Không còn mùi hôi thối nồng nặc, không chứa ấu trùng giòi bọ, mầm cỏ dại hay vi khuẩn E. coli.',
      'Tuyệt đối cấm sử dụng phân tươi hoặc nước phân chưa qua xử lý để tưới trực tiếp.',
    ],
    evidenceRequired: 'Ảnh chụp đống ủ phân hữu cơ có bạt che đậy kín hoặc chứng nhận phân hữu cơ vi sinh.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.4.2',
  },
  'VG-PB-03': {
    ruleCode: 'VG-PB-03',
    requirement: 'Có công thức và lịch châm phân bón (Fertigation) phù hợp với từng giai đoạn phát triển của cây.',
    checkpoints: [
      'Có bảng định mức EC (1.8 - 2.5 mS/cm) và pH (5.8 - 6.5) của dung dịch tưới theo tuổi cây.',
      'Ghi nhật ký số lượng kg phân bón sử dụng cho từng nhà màng theo từng chu kỳ tưới.',
    ],
    evidenceRequired: 'Ảnh chụp bảng lịch tưới châm dinh dưỡng dán tại trạm bơm Fertigation.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.4.3',
  },
  'VG-TV-01': {
    ruleCode: 'VG-TV-01',
    requirement: 'Thuốc BVTV mua từ đại lý hợp pháp, có tên trong danh mục được phép sử dụng tại Việt Nam.',
    checkpoints: [
      'Ưu tiên chế phẩm sinh học (Bt, dầu khoáng, nấm đối kháng Beauveria, bẫy dính màu vàng).',
      'Tuyệt đối không lưu trữ hoặc sử dụng thuốc BVTV thuộc Danh mục cấm sử dụng tại Việt Nam.',
    ],
    evidenceRequired: 'Ảnh chụp hóa đơn mua thuốc BVTV tại đại lý có giấy phép kinh doanh hợp pháp.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.4.4',
  },
  'VG-TV-02': {
    ruleCode: 'VG-TV-02',
    requirement: 'Ghi chép nhật ký phun thuốc BVTV đầy đủ: tên thuốc, hoạt chất, liều lượng, ngày phun, người phun.',
    checkpoints: [
      'Nhật ký ghi rõ: Tên thương phẩm, tên hoạt chất, nồng độ pha chế, mục đích trừ sâu bệnh gì.',
      'Ghi rõ lô/nhà màng xử lý, ngày phun và người trực tiếp thực hiện phun xịt.',
    ],
    evidenceRequired: 'Ảnh chụp màn hình nhật ký phun thuốc BVTV đã ghi nhận trên app.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.4.5',
  },
  'VG-TV-03': {
    ruleCode: 'VG-TV-03',
    requirement: 'Có biển cảnh báo thời gian cách ly tại cửa nhà màng ngay sau khi phun thuốc BVTV.',
    checkpoints: [
      'Treo biển cảnh báo nguy hiểm tại cửa nhà màng ngay sau khi phun: "KHU VỰC VỪA PHUN THUỐC - CẤM VÀO".',
      'Ghi rõ ngày giờ phun thuốc và thời điểm an toàn được phép vào lại nhà màng (Re-entry Interval).',
    ],
    evidenceRequired: 'Ảnh chụp biển cảnh báo thời gian cách ly treo tại cửa nhà màng vừa phun thuốc.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.4.6',
  },
  'VG-TV-04': {
    ruleCode: 'VG-TV-04',
    requirement: 'Vỏ bao bì thuốc BVTV sau sử dụng được thu gom vào bể chứa nguy hại có nắp đậy đúng quy định.',
    checkpoints: [
      'Vỏ chai, bao bì thuốc sau khi pha được súc rửa 3 lần, nước súc đổ vào bình phun.',
      'Vỏ thuốc bỏ vào bể chứa rác nguy hại xây bằng bê tông hoặc thùng nhựa có nắp đậy kín và dán nhãn nguy hại.',
    ],
    evidenceRequired: 'Ảnh chụp bể chứa vỏ bao bì thuốc BVTV nguy hại có nắp đậy tại trang trại.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.4.7',
  },

  // ─── PHẦN 5: THU HOẠCH, BẢO QUẢN, VẬN CHUYỂN ────────────
  'VG-TH-01': {
    ruleCode: 'VG-TH-01',
    requirement: 'Tuân thủ nghiêm ngặt thời gian cách ly (PHI) sau đợt phun thuốc cuối cùng mới tiến hành thu hoạch.',
    checkpoints: [
      'Thời gian cách ly (PHI) tối thiểu từ 7 đến 14 ngày (tùy theo hướng dẫn bắt buộc trên nhãn thuốc).',
      'Hệ thống tự động đối chiếu: Ngày thu hoạch trừ đi Ngày phun thuốc cuối cùng phải ≥ Số ngày PHI quy định.',
      'Nếu chưa hết hạn cách ly, hệ thống tự động cảnh báo Đỏ và đánh dấu Chưa đạt.',
    ],
    evidenceRequired: 'Ảnh chụp đối soát ngày phun thuốc cuối và ngày bắt đầu thu hoạch trên nhật ký mùa vụ.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.5.1',
  },
  'VG-TH-02': {
    ruleCode: 'VG-TH-02',
    requirement: 'Rau quả thu hoạch tuyệt đối không được để tiếp xúc trực tiếp với đất hay giá thể.',
    checkpoints: [
      'Rau quả sau khi cắt cuống đặt vào sọt/khay nhựa sạch có lót xốp lưới, tuyệt đối không đặt chạm nền đất.',
      'Sọt thu hoạch được đặt trên xe đẩy chuyên dụng hoặc kệ pallet cách mặt đất tối thiểu ≥ 15cm.',
    ],
    evidenceRequired: 'Ảnh chụp thao tác thu hoạch nông sản xếp gọn gàng trong khay sọt sạch cách sàn.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.5.2',
  },
  'VG-TH-03': {
    ruleCode: 'VG-TH-03',
    requirement: 'Kho bảo quản thoáng mát, sạch sẽ, duy trì nhiệt độ phù hợp tránh làm suy giảm chất lượng.',
    checkpoints: [
      'Nhiệt độ kho mát duy trì ổn định: 10 - 15°C đối với Dưa lưới, Cà chua; 4 - 8°C đối với Rau ăn lá.',
      'Độ ẩm tương đối duy trì 85 - 90%, sàn kho khô ráo, không đọng nước bẩn hay ẩm mốc.',
    ],
    evidenceRequired: 'Ảnh chụp nhiệt kế / ẩm kế điện tử hiển thị nhiệt độ kho mát bảo quản nông sản.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.5.3',
  },
  'VG-TH-04': {
    ruleCode: 'VG-TH-04',
    requirement: 'Có biện pháp kiểm soát và ngăn chặn động vật gây hại (chim, chuột, côn trùng) xâm nhập.',
    checkpoints: [
      'Lưới chắn côn trùng 50 mesh bao quanh nhà màng nguyên vẹn, không bị rách thủng.',
      'Cửa nhà màng có phòng đệm 2 lớp khép kín, bẫy chuột cơ học an toàn (tuyệt đối không dùng bả độc gần nông sản).',
    ],
    evidenceRequired: 'Ảnh chụp cửa đệm 2 lớp của nhà màng và lưới chắn côn trùng nguyên vẹn.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.5.4',
  },
  'VG-TH-05': {
    ruleCode: 'VG-TH-05',
    requirement: 'Phương tiện vận chuyển nông sản sạch sẽ, được che chắn tránh nắng mưa và bụi bẩn.',
    checkpoints: [
      'Thùng xe tải chuyên dụng có bạt che chắn hoặc xe đông lạnh, được xịt rửa khử trùng sạch trước khi bốc hàng.',
      'Không vận chuyển nông sản chung với phân bón, thuốc bảo vệ thực vật, hóa chất độc hại hay động vật sống.',
    ],
    evidenceRequired: 'Ảnh chụp thùng xe phương tiện vận chuyển sạch sẽ chở nông sản đóng thùng carton.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.5.5',
  },

  // ─── PHẦN 6: TRUY XUẤT NGUỒN GỐC & SẢN PHẨM ─────────────
  'VG-TX-01': {
    ruleCode: 'VG-TX-01',
    requirement: 'Phân biệt rõ ràng nông sản đạt chuẩn VietGAP với sản phẩm thông thường hoặc từ nguồn khác.',
    checkpoints: [
      'Sản phẩm VietGAP được dán tem nhãn QR Code nhận diện truy xuất nguồn gốc trên từng trái/túi rau.',
      'Khu vực tập kết nông sản đạt chuẩn VietGAP tách biệt rõ ràng với hàng loại 2 hoặc hàng chưa kiểm định.',
    ],
    evidenceRequired: 'Ảnh chụp tem nhãn mã QR VietGAP dán trên sản phẩm hoặc trên thùng đóng gói xuất xưởng.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.6.1',
  },
  'VG-TX-02': {
    ruleCode: 'VG-TX-02',
    requirement: 'Mỗi lô thu hoạch có mã số lô (Lot ID) gắn liền với nhà màng và ngày thu hoạch để truy xuất.',
    checkpoints: [
      'Mã lô hàng (Lot ID) thể hiện rõ: Mã mùa vụ (Season ID), mã nhà màng (Block ID), ngày thu hoạch.',
      'Khi quét mã QR trên quả có thể tra cứu ngược lại toàn bộ nhật ký bón phân, phun thuốc của chính lô đó.',
    ],
    evidenceRequired: 'Ảnh chụp phiếu xuất kho hoặc tem nhãn dán mã lô thu hoạch (Lot ID).',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.6.2',
  },
  'VG-TX-03': {
    ruleCode: 'VG-TX-03',
    requirement: 'Có quy trình xử lý và tiêu hủy sản phẩm không đạt chất lượng (dập nát, sâu bệnh, dư lượng).',
    checkpoints: [
      'Rau quả dập nát, sâu bệnh, thối hỏng được thu gom riêng vào thùng phế phẩm có nắp đậy.',
      'Có biên bản hủy phế phẩm nông sản hoặc ghi nhận chuyển mục đích làm phân hữu cơ compost.',
    ],
    evidenceRequired: 'Ảnh chụp thùng chứa nông sản loại bỏ hoặc biên bản tiêu hủy hàng lỗi.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.6.3',
  },

  // ─── PHẦN 7: AN TOÀN LAO ĐỘNG & MÔI TRƯỜNG ───────────────
  'VG-AT-01': {
    ruleCode: 'VG-AT-01',
    requirement: 'Người lao động được trang bị đầy đủ bảo hộ lao động: quần áo, găng tay, khẩu trang, kính bảo hộ.',
    checkpoints: [
      'Công nhân phun xịt thuốc trang bị quần áo chống thấm, mặt nạ phòng độc than hoạt tính, găng tay cao su, ủng.',
      'Công nhân thu hoạch đeo găng tay vệ sinh an toàn thực phẩm và tạp dề sạch.',
    ],
    evidenceRequired: 'Ảnh chụp công nhân mang đầy đủ đồ bảo hộ lao động khi đang thao tác tại trang trại.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.7.1',
  },
  'VG-AT-02': {
    ruleCode: 'VG-AT-02',
    requirement: 'Có tủ thuốc y tế sơ cứu ban đầu và bảng nội quy an toàn lao động treo tại nơi làm việc.',
    checkpoints: [
      'Tủ thuốc sơ cứu có bông băng gạc, cồn đỏ sát trùng, nước muối sinh lý, thuốc nhỏ mắt, thuốc hạ sốt còn hạn dùng.',
      'Bảng nội quy an toàn lao động và số điện thoại cấp cứu 115 được treo tại văn phòng và nhà sơ chế.',
    ],
    evidenceRequired: 'Ảnh chụp tủ thuốc y tế sơ cứu ban đầu và bảng nội quy an toàn lao động.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.7.2',
  },
  'VG-AT-03': {
    ruleCode: 'VG-AT-03',
    requirement: 'Tuyệt đối cấm tái sử dụng bao bì, thùng chứa phân bón, thuốc BVTV để đựng nông sản.',
    checkpoints: [
      'Không dùng xô, chậu, bao tải đã đựng hóa chất nông nghiệp để chứa nông sản sau thu hoạch.',
      'Bao bì phân bón rỗng được xếp gọn gàng ở kho chứa chất thải, chờ bàn giao cho đơn vị tái chế.',
    ],
    evidenceRequired: 'Ảnh chụp khu lưu giữ bao bì phân bón rỗng riêng biệt, xa khu vực sơ chế nông sản.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.7.3',
  },
  'VG-AT-04': {
    ruleCode: 'VG-AT-04',
    requirement: 'Có hệ thống thu gom, xử lý rác thải sinh hoạt, tàn dư thực vật và nước thải đúng quy định.',
    checkpoints: [
      'Tàn dư lá tỉa, thân cây sau mùa vụ được thu gom vào hố ủ phân compost hoặc đưa ra điểm tập kết rác hữu cơ.',
      'Nước rửa sàn nhà sơ chế được dẫn qua bể lắng lọc cát trước khi xả ra mương thoát nước sinh thái.',
    ],
    evidenceRequired: 'Ảnh chụp hố ủ tàn dư thực vật hoặc bể lắng lọc xử lý nước thải sơ chế.',
    tcvnClause: 'TCVN 11892-1:2017 Điều 4.7.4',
  },
};

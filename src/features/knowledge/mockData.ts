import type { KnowledgeArticle } from './types';

/**
 * Dữ liệu mẫu cho thư viện kiến thức VietGAP công khai.
 * TODO: khi có API backend, xoá file này và lấy dữ liệu qua `knowledgeService.ts`.
 */
export const MOCK_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kn-01',
    title: 'VietGAP là gì và vì sao nông hộ nên áp dụng?',
    summary:
      'Tổng quan về tiêu chuẩn Thực hành nông nghiệp tốt tại Việt Nam (VietGAP), lợi ích cho nông hộ và thị trường tiêu thụ.',
    content:
      'VietGAP (Vietnamese Good Agricultural Practices) là tập hợp các nguyên tắc, trình tự và thủ tục hướng dẫn sản xuất nhằm đảm bảo an toàn thực phẩm, truy xuất nguồn gốc, bảo vệ môi trường và sức khoẻ người lao động. Áp dụng VietGAP giúp nông hộ nâng cao uy tín sản phẩm, dễ dàng tiếp cận các kênh phân phối hiện đại như siêu thị, xuất khẩu, đồng thời giảm thiểu rủi ro về dư lượng hoá chất và dịch hại.',
    category: 'regulation',
    tags: ['tổng quan', 'tiêu chuẩn', 'chứng nhận'],
    readTimeMinutes: 4,
    publishedAt: '2026-08-20',
    viewCount: 1520,
  },
  {
    id: 'kn-02',
    title: '4 nhóm tiêu chí bắt buộc trong chứng nhận VietGAP',
    summary: 'Phân tích các nhóm tiêu chí: đánh giá vùng sản xuất, giống, quản lý đất - nước và ghi chép hồ sơ.',
    content:
      'Bộ tiêu chí VietGAP được chia thành các nhóm chính: (1) đánh giá và lựa chọn vùng sản xuất phù hợp, không bị ô nhiễm; (2) quản lý giống và gốc ghép có nguồn gốc rõ ràng; (3) quản lý đất, giá thể và nguồn nước tưới; (4) ghi chép, lưu trữ hồ sơ phục vụ truy xuất nguồn gốc. Mỗi nhóm tiêu chí có các chỉ tiêu bắt buộc (A) và khuyến khích (B), nông hộ cần đạt 100% chỉ tiêu bắt buộc để được cấp chứng nhận.',
    category: 'regulation',
    tags: ['tiêu chí', 'chứng nhận'],
    readTimeMinutes: 6,
    publishedAt: '2026-08-15',
    viewCount: 1180,
  },
  {
    id: 'kn-03',
    title: 'Quy trình đăng ký và cấp giấy chứng nhận VietGAP',
    summary: 'Các bước từ chuẩn bị hồ sơ, đánh giá nội bộ đến đăng ký với tổ chức chứng nhận.',
    content:
      'Quy trình gồm: chuẩn bị hồ sơ vùng sản xuất, xây dựng quy trình sản xuất và mẫu biểu ghi chép, tổ chức đào tạo nội bộ, tự đánh giá theo checklist VietGAP, khắc phục các điểm chưa đạt, sau đó nộp hồ sơ đăng ký với tổ chức chứng nhận được chỉ định. Tổ chức chứng nhận sẽ cử chuyên gia đánh giá thực địa trước khi cấp giấy chứng nhận có hiệu lực tối đa 3 năm.',
    category: 'regulation',
    tags: ['quy trình', 'hồ sơ'],
    readTimeMinutes: 5,
    publishedAt: '2026-07-28',
    viewCount: 860,
  },
  {
    id: 'kn-04',
    title: 'Đánh giá và lựa chọn vùng sản xuất an toàn',
    summary: 'Các yếu tố cần khảo sát: nguồn ô nhiễm, lịch sử canh tác và khoảng cách với khu công nghiệp.',
    content:
      'Trước khi canh tác, cần khảo sát lịch sử sử dụng đất, khoảng cách tới khu công nghiệp, bãi rác, nghĩa trang hoặc nguồn nước thải chưa qua xử lý. Nếu nghi ngờ đất hoặc nước có nguy cơ ô nhiễm kim loại nặng, nên lấy mẫu phân tích tại phòng thí nghiệm được công nhận trước khi đưa vào sản xuất.',
    category: 'soil-water',
    tags: ['vùng sản xuất', 'khảo sát'],
    readTimeMinutes: 5,
    publishedAt: '2026-08-02',
    viewCount: 640,
  },
  {
    id: 'kn-05',
    title: 'Quản lý và cải tạo đất trồng theo hướng bền vững',
    summary: 'Luân canh, che phủ đất và bổ sung hữu cơ để duy trì độ phì nhiêu lâu dài.',
    content:
      'Để duy trì độ phì nhiêu, nông hộ nên luân canh cây trồng, hạn chế cày xới quá mức, bổ sung phân hữu cơ hoai mục và che phủ đất bằng rơm rạ hoặc màng phủ sinh học. Định kỳ kiểm tra pH và hàm lượng dinh dưỡng trong đất để điều chỉnh lượng phân bón phù hợp, tránh bón thừa gây thoái hoá đất.',
    category: 'soil-water',
    tags: ['đất trồng', 'canh tác bền vững'],
    readTimeMinutes: 6,
    publishedAt: '2026-06-30',
    viewCount: 512,
  },
  {
    id: 'kn-06',
    title: 'Tiêu chuẩn chất lượng nước tưới trong VietGAP',
    summary: 'Ngưỡng cho phép về vi sinh và kim loại nặng trong nước tưới, tần suất kiểm nghiệm.',
    content:
      'Nước tưới phải được kiểm nghiệm định kỳ (tối thiểu 1 lần/năm) để đảm bảo không vượt ngưỡng cho phép về E.coli, kim loại nặng và hoá chất tồn dư theo quy chuẩn QCVN hiện hành. Không sử dụng nước thải sinh hoạt hoặc công nghiệp chưa qua xử lý để tưới cho cây trồng.',
    category: 'soil-water',
    tags: ['nước tưới', 'kiểm nghiệm'],
    readTimeMinutes: 4,
    publishedAt: '2026-05-18',
    viewCount: 398,
  },
  {
    id: 'kn-07',
    title: 'Chọn giống cây trồng đạt chuẩn VietGAP',
    summary: 'Tiêu chí lựa chọn nguồn giống rõ ràng, khoẻ mạnh và phù hợp điều kiện canh tác.',
    content:
      'Giống hoặc gốc ghép phải có nguồn gốc rõ ràng, được mua từ cơ sở cung ứng giống hợp pháp, có hồ sơ theo dõi lô giống. Nếu tự nhân giống, cần ghi chép đầy đủ nguồn gốc cây mẹ, thời gian nhân giống và kết quả kiểm tra sâu bệnh trước khi đưa vào sản xuất đại trà.',
    category: 'seed-cultivation',
    tags: ['giống cây trồng', 'nguồn gốc'],
    readTimeMinutes: 4,
    publishedAt: '2026-08-10',
    viewCount: 705,
  },
  {
    id: 'kn-08',
    title: 'Kỹ thuật gieo trồng và mật độ hợp lý theo mùa vụ',
    summary: 'Bố trí mật độ, thời vụ và khoảng cách trồng để tối ưu năng suất, hạn chế sâu bệnh.',
    content:
      'Mật độ gieo trồng cần dựa trên đặc tính giống, độ phì đất và điều kiện khí hậu từng vùng. Trồng quá dày làm tăng độ ẩm tán lá, tạo điều kiện cho nấm bệnh phát triển; trồng quá thưa lại lãng phí diện tích canh tác. Nên tham khảo lịch thời vụ khuyến cáo của cơ quan khuyến nông địa phương.',
    category: 'seed-cultivation',
    tags: ['thời vụ', 'mật độ trồng'],
    readTimeMinutes: 5,
    publishedAt: '2026-04-22',
    viewCount: 340,
  },
  {
    id: 'kn-09',
    title: 'Nguyên tắc "4 đúng" khi sử dụng thuốc bảo vệ thực vật',
    summary: 'Đúng thuốc, đúng liều lượng, đúng lúc và đúng cách để đảm bảo an toàn và hiệu quả.',
    content:
      'Nguyên tắc 4 đúng gồm: đúng thuốc (nằm trong danh mục được phép sử dụng), đúng liều lượng - nồng độ theo khuyến cáo trên nhãn, đúng thời điểm (tránh giai đoạn gần thu hoạch để đảm bảo thời gian cách ly), và đúng cách phun rải. Tuân thủ nguyên tắc này giúp giảm dư lượng thuốc trên nông sản và bảo vệ sức khoẻ người phun thuốc.',
    category: 'fertilizer-pesticide',
    tags: ['thuốc BVTV', 'an toàn'],
    readTimeMinutes: 5,
    publishedAt: '2026-08-05',
    viewCount: 990,
  },
  {
    id: 'kn-10',
    title: 'Thời gian cách ly thuốc BVTV trước khi thu hoạch',
    summary: 'Cách tra cứu và tuân thủ thời gian cách ly để nông sản đạt ngưỡng dư lượng an toàn.',
    content:
      'Mỗi loại thuốc bảo vệ thực vật có thời gian cách ly khác nhau, được ghi rõ trên nhãn sản phẩm. Nông hộ cần ghi chép ngày phun thuốc và tính toán ngày thu hoạch dự kiến để đảm bảo tuân thủ đúng thời gian cách ly, tránh thu hoạch sớm khi dư lượng thuốc còn vượt ngưỡng cho phép.',
    category: 'fertilizer-pesticide',
    tags: ['thời gian cách ly', 'dư lượng'],
    readTimeMinutes: 4,
    publishedAt: '2026-03-14',
    viewCount: 455,
  },
  {
    id: 'kn-11',
    title: 'Sử dụng phân bón hữu cơ và vô cơ cân đối',
    summary: 'Kết hợp phân hữu cơ hoai mục với phân vô cơ theo nhu cầu dinh dưỡng của cây.',
    content:
      'Việc kết hợp phân hữu cơ đã hoai mục với phân vô cơ theo đúng liều lượng giúp cải thiện cấu trúc đất, cung cấp dinh dưỡng cân đối và hạn chế ô nhiễm nguồn nước do rửa trôi phân bón. Không sử dụng phân chuồng tươi chưa qua ủ hoai để tránh lây nhiễm vi sinh vật gây hại.',
    category: 'fertilizer-pesticide',
    tags: ['phân bón', 'dinh dưỡng'],
    readTimeMinutes: 6,
    publishedAt: '2026-02-27',
    viewCount: 289,
  },
  {
    id: 'kn-12',
    title: 'Kỹ thuật thu hoạch giảm tổn thất sau thu hoạch',
    summary: 'Thời điểm thu hoạch, dụng cụ và cách xử lý sơ bộ để giữ chất lượng nông sản.',
    content:
      'Thu hoạch đúng độ chín sinh lý, sử dụng dụng cụ sạch, sắc bén để hạn chế tổn thương cơ học trên nông sản. Sau thu hoạch, cần phân loại, loại bỏ sản phẩm hư hỏng và bảo quản nơi thoáng mát, tránh ánh nắng trực tiếp để giảm thiểu hao hụt và giữ chất lượng trước khi vận chuyển.',
    category: 'harvest-post-harvest',
    tags: ['thu hoạch', 'bảo quản'],
    readTimeMinutes: 5,
    publishedAt: '2026-07-19',
    viewCount: 610,
  },
  {
    id: 'kn-13',
    title: 'Vệ sinh dụng cụ và khu vực sơ chế nông sản',
    summary: 'Yêu cầu vệ sinh đối với dụng cụ chứa đựng, khu sơ chế để tránh lây nhiễm chéo.',
    content:
      'Khu vực sơ chế, đóng gói cần được vệ sinh định kỳ, có khu vực riêng biệt tránh lây nhiễm chéo giữa sản phẩm và chất thải. Dụng cụ chứa đựng (sọt, thùng) nên làm từ vật liệu dễ vệ sinh, không sử dụng chung với dụng cụ đựng hoá chất hoặc phân bón.',
    category: 'harvest-post-harvest',
    tags: ['vệ sinh', 'sơ chế'],
    readTimeMinutes: 4,
    publishedAt: '2026-01-30',
    viewCount: 275,
  },
  {
    id: 'kn-14',
    title: 'Hệ thống ghi chép nhật ký canh tác theo VietGAP',
    summary: 'Các loại biểu mẫu cần lưu trữ: giống, phân bón, thuốc BVTV, thu hoạch và tiêu thụ.',
    content:
      'Nông hộ cần duy trì nhật ký ghi chép đầy đủ: nguồn gốc giống, lịch sử sử dụng phân bón và thuốc BVTV (ngày, loại, liều lượng), ngày thu hoạch, sản lượng và nơi tiêu thụ. Hồ sơ này là căn cứ quan trọng để truy xuất nguồn gốc khi có yêu cầu kiểm tra hoặc khi xảy ra sự cố về an toàn thực phẩm.',
    category: 'record-traceability',
    tags: ['ghi chép', 'nhật ký'],
    readTimeMinutes: 5,
    publishedAt: '2026-08-12',
    viewCount: 830,
  },
  {
    id: 'kn-15',
    title: 'Mã số vùng trồng và truy xuất nguồn gốc điện tử',
    summary: 'Vai trò của mã số vùng trồng và QR code trong việc minh bạch chuỗi cung ứng.',
    content:
      'Mã số vùng trồng giúp cơ quan quản lý và người tiêu dùng xác định chính xác nguồn gốc xuất xứ của nông sản. Kết hợp với hệ thống QR code hoặc phần mềm nhật ký điện tử, nông hộ có thể minh bạch hoá toàn bộ quá trình canh tác, từ đó tăng độ tin cậy khi xuất khẩu hoặc bán vào kênh phân phối hiện đại.',
    category: 'record-traceability',
    tags: ['mã vùng trồng', 'QR code'],
    readTimeMinutes: 6,
    publishedAt: '2026-06-08',
    viewCount: 470,
  },
  {
    id: 'kn-16',
    title: 'Đào tạo và trang bị bảo hộ cho người lao động',
    summary: 'Yêu cầu tập huấn định kỳ, sử dụng đồ bảo hộ khi tiếp xúc hoá chất nông nghiệp.',
    content:
      'Người lao động trực tiếp tham gia sản xuất cần được tập huấn định kỳ về kỹ thuật canh tác an toàn, cách sử dụng và bảo quản hoá chất, cũng như sơ cứu khi xảy ra sự cố. Khi pha chế hoặc phun thuốc BVTV, bắt buộc trang bị đầy đủ đồ bảo hộ như khẩu trang, găng tay, kính bảo hộ và quần áo dài tay.',
    category: 'training-certification',
    tags: ['đào tạo', 'an toàn lao động'],
    readTimeMinutes: 4,
    publishedAt: '2026-07-02',
    viewCount: 560,
  },
  {
    id: 'kn-17',
    title: 'Đánh giá nội bộ trước khi đăng ký chứng nhận',
    summary: 'Cách xây dựng checklist tự đánh giá và khắc phục điểm chưa đạt trước khi mời đánh giá.',
    content:
      'Trước khi mời tổ chức chứng nhận đánh giá chính thức, nông hộ nên tự tổ chức đánh giá nội bộ dựa trên checklist đầy đủ các chỉ tiêu VietGAP. Việc này giúp phát hiện sớm các điểm chưa đạt để có thời gian khắc phục, tránh mất chi phí và thời gian khi đánh giá chính thức không đạt yêu cầu.',
    category: 'training-certification',
    tags: ['đánh giá nội bộ', 'checklist'],
    readTimeMinutes: 5,
    publishedAt: '2026-05-25',
    viewCount: 415,
  },
  {
    id: 'kn-18',
    title: 'Quản lý và xử lý chất thải nông nghiệp đúng cách',
    summary: 'Phân loại bao bì thuốc BVTV, chất thải hữu cơ và nơi thu gom theo quy định.',
    content:
      'Bao bì, chai lọ đựng thuốc BVTV sau sử dụng phải được thu gom vào bể chứa chuyên dụng, không vứt bừa bãi ra kênh mương hoặc đồng ruộng. Chất thải hữu cơ như cành lá, phụ phẩm cây trồng nên được ủ compost để tái sử dụng làm phân bón, góp phần giảm thiểu ô nhiễm môi trường xung quanh khu vực canh tác.',
    category: 'soil-water',
    tags: ['chất thải', 'môi trường'],
    readTimeMinutes: 5,
    publishedAt: '2026-04-05',
    viewCount: 322,
  },
];

# Chưa hoàn thành + các việc cần làm

*Các phòng hiện tại chỉ hiện ở Loại Studio, còn muốn đổi qua phòng khác phải sửa thẳng trong db, sửa trong db xong thì phòng đó ở đúng mục nhưng vẫn hiển thị ở bên mục studio
*Vào trang bài viết, có 1 card bài bất kỳ, có hình ngôi sao, trỏ vào rồi chọn sao để đánh giá bài viết thì bị báo là invalid token
$Chưa làm report bình luận -> khiến bên bảng quản lý bình luận của admin chưa thể hành động gì được bên bảng này
Muốn làm: user report bình luận -> bình luận sẽ thông báo và được ẩn chỉ đối với user đó -> bình luận bị báo cáo đó sẽ hiện lên bên bảng quản lý bình luận của admin, chỉ khi admin bấm xóa hoặc khôi phục bình luận thì mới thay đổi trực tiếp trên bài viết
$Trong database, bảng transactions có trường member_user_id mới set khóa ngoại với bảng membership_user, nhưng hiện đang để là null chưa có truyền giá trị vào
*: cần làm
$: ưng thì làm, không thì thôi để đó

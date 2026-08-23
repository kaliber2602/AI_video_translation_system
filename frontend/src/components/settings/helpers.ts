// =========================================================
// Avatar Helper
// =========================================================
//
// Backend đang lưu avatar dưới dạng:
//    Base64 thuần
//
// Ví dụ:
//    /9j/4AAQSkZJRgABAQ...
//
// Vì vậy khi đưa vào <img src=""> phải chuyển thành:
//    data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...
//
// Nếu không thêm prefix, browser sẽ hiểu Base64
// là một URL tương đối và dẫn tới lỗi 414.
// =========================================================

export const getAvatarSrc = (
  avatar?: string | null
): string | null => {
  if (!avatar) {
    return null;
  }

  // Trường hợp backend sau này trả về
  // data:image/... sẵn.
  if (avatar.startsWith("data:image/")) {
    return avatar;
  }

  // Backend hiện tại luôn convert ảnh thành JPEG.
  return `data:image/jpeg;base64,${avatar}`;
};

export const getInitials = (
  fullName: string
): string => {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || "U";
};

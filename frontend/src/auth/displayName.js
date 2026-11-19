/** How to greet a user: first name if set, otherwise the part of the email before the "@". */
export function displayName(user) {
  return user.first_name?.trim() || user.email.split('@')[0]
}

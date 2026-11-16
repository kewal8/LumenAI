/** How a person is greeted: "Dr. Anita Rao" becomes "Dr. Anita", "Anita Rao" becomes "Anita". */
export function greetingName(name: string) {
  const words = name.trim().split(/\s+/);
  if (!words[0]) return "Doctor";
  return /^dr\.?$/i.test(words[0]) && words[1] ? `${words[0]} ${words[1]}` : words[0];
}

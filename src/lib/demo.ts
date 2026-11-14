/** Demo accounts created by `npm run seed`. Shown on the login page for judges. */
export const DEMO_PASSWORD = "demo1234";
export const DEMO_ACCOUNTS = [
  { role: "Renter", email: "renter@demo.com", hint: "Book & charge" },
  { role: "Host", email: "host@demo.com", hint: "List & earn" },
  { role: "Admin", email: "admin@demo.com", hint: "Verify hosts" },
] as const;

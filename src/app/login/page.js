import LoginClient from "./LoginClient";

export default function LoginPage({ searchParams }) {
  const blocked = String(searchParams?.blocked || "") === "1";
  const next = typeof searchParams?.next === "string" ? searchParams.next : "";
  const nextPath = next && next.startsWith("/") ? next : "/dashboard";

  return <LoginClient blocked={blocked} nextPath={nextPath} />;
}

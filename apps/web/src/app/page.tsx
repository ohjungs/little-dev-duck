import { scaffoldPing, type ScaffoldPing } from "@ldd/core";

export default function Home() {
  const ping: ScaffoldPing = scaffoldPing;
  return (
    <main>
      <p>{ping.message}</p>
    </main>
  );
}

export default function NotFound(): JSX.Element {
  return (
    <div className="space-y-4 text-center py-24">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-[color:var(--color-muted)]">
        That page doesn&apos;t exist. <a href="/">Back to home</a>.
      </p>
    </div>
  );
}

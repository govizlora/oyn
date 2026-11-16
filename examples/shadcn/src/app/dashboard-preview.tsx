import Dashboard from '@/app/page';
import { ComparisonControls } from '@/app/comparison-controls';

/** A self-contained preview section, ready to sit inside a longer showcase page. */
export function DashboardPreview() {
  return (
    <section aria-label="Dashboard comparison" className="mx-auto w-full max-w-[1600px] px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
      <div data-dashboard-preview className="relative h-[clamp(520px,78svh,900px)] overflow-hidden rounded-2xl border bg-sidebar shadow-sm sm:rounded-3xl">
        <Dashboard />
      </div>
      <div data-preview-controls className="flex flex-wrap items-center justify-between gap-4 px-1 pt-5 sm:px-2">
        <div>
          <p className="text-sm font-medium">shadcn/ui · Dashboard</p>
          <p className="mt-1 text-xs text-muted-foreground">Same components. A different surface.</p>
        </div>
        <ComparisonControls />
      </div>
    </section>
  );
}

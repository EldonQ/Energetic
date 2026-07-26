import { PlayPauseButton } from '@/components/ui/PlayPauseButton';

export function Footer() {
  return (
    <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between p-8 md:p-10">
      <div className="pointer-events-auto max-w-md">
        <PlayPauseButton />
      </div>
    </footer>
  );
}

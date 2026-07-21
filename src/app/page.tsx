import { getAllStudiosForDiscovery } from "@/app/actions/discover";
import { DiscoveryView } from "@/components/discovery/DiscoveryView";

export const revalidate = 60;

export default async function HomePage() {
  const initialStudios = await getAllStudiosForDiscovery({});
  return (
    <main className="h-[calc(100vh-3.5rem)]">
      <DiscoveryView initialStudios={initialStudios} />
    </main>
  );
}

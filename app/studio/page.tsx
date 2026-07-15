import { requireAdminUser } from "../admin-auth";
import { listAdminAlbums } from "../../db/gallery";
import { StudioClient } from "./studio-client";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await requireAdminUser();
  const albums = await listAdminAlbums();
  return <StudioClient ownerName={user.displayName} initialAlbums={albums} />;
}

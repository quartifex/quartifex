import { PointerFx } from "@/components/ui/PointerFx";
import "@/styles/kit.css";
import "@/styles/lab-kit.css";
import { KitUi } from "./KitUi";
import { LabTag } from "./LabTag";
import { Preloader } from "./Preloader";

/**
 * The kit's page-level pieces: pointer light, logo preloader, sound and cursor engine, and the
 * LAB tag. Rendered once by the hub and login layouts; the bare scene routes do not carry it.
 */
export function KitRoot() {
  return (
    <>
      <div id="pl-cover" aria-hidden="true" />
      <PointerFx />
      <Preloader />
      <KitUi />
      <LabTag />
    </>
  );
}

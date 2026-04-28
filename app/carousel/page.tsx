export const dynamic = "force-dynamic";

import { CarouselWorkflow } from "@/components/carousel-workflow";

export default function CarouselPage() {
  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      <CarouselWorkflow />
    </div>
  );
}

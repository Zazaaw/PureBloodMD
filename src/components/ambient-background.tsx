import DotPattern from "@/components/effects/dot-pattern";
import GridPattern from "@/components/effects/grid-pattern";

/** Kit recipe: two masked layers toward opposite corners, behind everything. */
export function AmbientBackground() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0">
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className="[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0">
        <GridPattern
          width={50}
          height={50}
          duration={15}
          maxOpacity={0.1}
          x={-1}
          y={-1}
          className="[mask-image:linear-gradient(to_top_left,white,transparent,transparent)]"
        />
      </div>
    </>
  );
}

import { VadivamIcon, type VadivamIconProps } from "./vadivam-icon";

export function Orbit(props: VadivamIconProps) {
  return (
    <VadivamIcon name="orbit" {...props}>
      <path d="M13.473 3.12A9 9 0 0 0 3.12 13.473m7.407 7.407q.72.12 1.473.12a9 9 0 0 0 8.88-10.473M16.5 5.5a2 2 0 1 0 4 0 2 2 0 0 0-4 0m-13 13a2 2 0 1 0 4 0 2 2 0 0 0-4 0M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
    </VadivamIcon>
  );
}

export { Orbit as OrbitIcon };
export default Orbit;

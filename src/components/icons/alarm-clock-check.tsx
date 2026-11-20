import { VadivamIcon, type VadivamIconProps } from "./vadivam-icon";

export function AlarmClockCheck(props: VadivamIconProps) {
  return (
    <VadivamIcon name="alarm-clock-check" {...props}>
      <path d="M2.5 4.348 5.825 2M21.5 4.348 18.175 2m2.27 10.5a8.4 8.4 0 0 1-2.474 5.955 8.46 8.46 0 0 1-5.972 2.466 8.46 8.46 0 0 1-5.97-2.466A8.4 8.4 0 0 1 3.556 12.5a8.4 8.4 0 0 1 2.473-5.954 8.46 8.46 0 0 1 5.97-2.467c2.24 0 4.388.887 5.972 2.467a8.4 8.4 0 0 1 2.473 5.954m-2.213 5.731L22 22M5.769 18.231 2 22" />
      <path d="M9 13.286 10.875 15s2.289-3.2 4.125-4" />
    </VadivamIcon>
  );
}

export { AlarmClockCheck as AlarmClockCheckIcon };
export default AlarmClockCheck;

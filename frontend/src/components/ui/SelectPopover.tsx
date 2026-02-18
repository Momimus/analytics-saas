import Select from "./Select";

type Item = {
  label: string;
  value: string;
};

type SelectPopoverProps = {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function SelectPopover({ items, value, onChange, className }: SelectPopoverProps) {
  return <Select items={items} value={value} onChange={onChange} className={className} />;
}

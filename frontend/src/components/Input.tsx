import type { InputHTMLAttributes } from "react";
import { formInputCompactClass, formLabelClass, formLabelTextClass } from "../lib/uiClasses";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <label className={formLabelClass}>
      <span className={formLabelTextClass}>{label}</span>
      <input
        className={`${formInputCompactClass} ${
          className ?? ""
        }`}
        {...props}
      />
    </label>
  );
}

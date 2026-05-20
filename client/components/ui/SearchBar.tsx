"use client";

import { Search } from "lucide-react";
import React from "react";

type SearchBarProps = React.ComponentPropsWithoutRef<"input"> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  leftIcon?: React.ReactNode | null; // pass null to hide
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "",
  wrapperClassName,
  inputClassName,
  leftIcon,
  ...rest
}: SearchBarProps) {
  const renderIcon = () => {
    if (leftIcon === null) return null;
    if (leftIcon) return leftIcon;
    return <Search className="h-5 text-muted-foreground" aria-hidden />;
  };

  return (
    <div className={wrapperClassName ?? "search-pill flex items-center gap-2 px-3 py-1"}>
      {renderIcon()}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClassName ?? "min-h-10 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"}
        {...rest}
      />
    </div>
  );
}

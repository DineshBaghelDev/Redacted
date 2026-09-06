import { useRef } from "react";

const CODE_LENGTH = 6;

const otpInputClass =
  "h-12 min-w-0 flex-1 border border-cyan-300 bg-[#020817]/90 text-center text-xl uppercase text-cyan-100 outline-none placeholder:text-cyan-100/45";

type RoomCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function RoomCodeInput({ value, onChange }: RoomCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function focusBox(index: number) {
    inputsRef.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))]?.focus();
  }

  function handleChange(index: number, raw: string) {
    const char = raw.slice(-1).toUpperCase();
    const chars = value.padEnd(CODE_LENGTH, "").split("");
    // Fill the next empty box so the code always stays contiguous.
    const targetIndex = value.length < CODE_LENGTH ? value.length : index;
    chars[targetIndex] = char;
    onChange(chars.join(""));
    focusBox(targetIndex + 1);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = value.split("");
      if (chars[index]) {
        chars[index] = "";
        onChange(chars.join(""));
      } else if (index > 0) {
        focusBox(index - 1);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      focusBox(index - 1);
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      focusBox(index + 1);
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!pasted) return;
    const nextValue = (value + pasted).slice(0, CODE_LENGTH);
    onChange(nextValue);
    focusBox(nextValue.length - 1);
  }

  return (
    <div className="flex w-full gap-2" onPaste={handlePaste}>
      {Array.from({ length: CODE_LENGTH }, (_, index) => (
        <input
          aria-label={`Room code character ${index + 1}`}
          autoCapitalize="characters"
          autoFocus={index === 0}
          className={otpInputClass}
          inputMode="text"
          key={index}
          maxLength={1}
          onBeforeInput={(event) => {
            const data = (event.nativeEvent as InputEvent).data;
            if (data && !/[A-Za-z0-9]/.test(data)) {
              event.preventDefault();
            }
          }}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          spellCheck={false}
          value={value[index] ?? ""}
        />
      ))}
    </div>
  );
}
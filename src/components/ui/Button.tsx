interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => (
  <button
    {...props}
    className={`bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ${props.className || ""}`}
  >
    {children}
  </button>
);

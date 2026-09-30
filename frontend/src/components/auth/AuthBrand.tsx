import logoLoginForm from "../../assets/logo-login_form.png";

interface AuthBrandProps {
  className?: string;
  imageClassName?: string;
}

export default function AuthBrand({ className = "", imageClassName = "" }: AuthBrandProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={logoLoginForm}
        alt="VIDNOVA"
        className={`h-11 sm:h-12 w-auto max-w-full object-contain select-none ${imageClassName}`}
      />
    </div>
  );
}
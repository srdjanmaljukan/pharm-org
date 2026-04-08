import { APP_NAME } from "@/lib/constants";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="wrapper py-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          © {currentYear} {APP_NAME}
        </p>
        <p className="text-xs text-muted-foreground">
          Interna aplikacija — nije za javnu upotrebu
        </p>
      </div>
    </footer>
  );
};

export default Footer;

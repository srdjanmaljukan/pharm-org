import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import Menu from "./menu";
import { FlaskConical } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="wrapper flex-between h-14">
        <div className="flex-start gap-2">
          <Link href="/" className="flex items-center gap-2 ml-1">
            <div className="bg-primary rounded-lg p-1.5">
              <FlaskConical className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              {APP_NAME}
            </span>
          </Link>
        </div>
        <Menu />
      </div>
    </header>
  );
};

export default Header;

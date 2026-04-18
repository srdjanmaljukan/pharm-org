import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import Menu from "./menu";
import { FlaskConical } from "lucide-react";
import { auth } from "@/auth";
import { getActiveNotificationCount } from "@/lib/actions/notification.actions";

const Header = async () => {
  const session = await auth();
  const userName = session?.user?.name ?? null;

  let notifCount = 0;
  if (session?.user) {
    try {
      notifCount = await getActiveNotificationCount();
    } catch {}
  }

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
        <Menu userName={userName} notifCount={notifCount} />
      </div>
    </header>
  );
};

export default Header;

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Notifications from "./notifcations";

// COPY AGAIN FROM PROSTORE TO GET USER ICON FOR LATER

const Menu = () => {
  return (
    <div className="flex justify-end gap-3">
      <nav className="flex gap-3">
        <Notifications />
        {/* Add UserIcon component with dropdown menu functionality here */}
        <div>User</div>
      </nav>
    </div>
  );
};

export default Menu;

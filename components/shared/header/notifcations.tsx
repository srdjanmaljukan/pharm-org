import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

const Notifications = () => {
    return ( 
        <DropdownMenu>
            {/* Add functionality for notifications */}
          <DropdownMenuTrigger>
            <Bell />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Obavještenja</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Obavjest 1</DropdownMenuItem>
            <DropdownMenuItem>Obavjest 2</DropdownMenuItem>
            <DropdownMenuItem>Obavjest 3</DropdownMenuItem>
            <DropdownMenuItem>Obavjest 4</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> );
}
 
export default Notifications;
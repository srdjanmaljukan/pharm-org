import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center w-full justify-evenly mt-20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nedavne porudžbine</CardTitle>
          <CardAction>
            <Button asChild>
              <Link href="/">Vidi sve</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <div>Porudžbina 1</div>
            <div>Porudžbina 2</div>
            <div>Porudžbina 3</div>
            <div>Porudžbina 4</div>
            <div>Porudžbina 5</div>
          </div>
        </CardContent>
      </Card>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nedavne reklamacije</CardTitle>
          <CardAction>
            <Button asChild>
              <Link href="/">Vidi sve</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <div>Reklamacija 1</div>
            <div>Reklamacija 2</div>
            <div>Reklamacija 3</div>
            <div>Reklamacija 4</div>
            <div>Reklamacija 5</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

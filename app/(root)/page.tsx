import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAllOrders } from "@/lib/actions/order.actions";
import Link from "next/link";

// Limit for recent orders
const LIMIT = 10;

export default async function Home() {

  const latestOrders = await getAllOrders(LIMIT);

  return (
    <div className="flex items-center w-full justify-evenly mt-20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nedavne porudžbine</CardTitle>
          <CardAction>
            <Button asChild>
              <Link href="/orders">Vidi sve</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {latestOrders.map((order) => (
            <div key={order.id} className="">
              <div>{order.productName}</div>
              <div>{order.status}</div>
              <div>{order.updatedById}</div>
            </div>
          ))}
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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllOrders } from "@/lib/actions/order.actions";
import { formatDateTime } from "@/lib/utils";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Porudžbine"
}

const OrdersPage = async () => {

    const orders = await getAllOrders();

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IME PREPARATA</TableHead>
              <TableHead>KOLIČINA</TableHead>
              <TableHead>BROJ TELEFONA</TableHead>
              <TableHead>IME OSOBE</TableHead>
              <TableHead>KOMENTAR</TableHead>
              <TableHead>DOBAVLJAČ</TableHead>
              <TableHead>DATUM</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>OPCIJE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.productName}</TableCell>
                <TableCell>
                  {order.qty}
                </TableCell>
                <TableCell>{order.phoneNumber}</TableCell>
                <TableCell>{order.personName ? order.personName : ""}</TableCell>
                <TableCell>
                  {order.note ? order.note : ""}
                </TableCell>
                <TableCell>
                  {order.distributor ? order.distributor : ""}
                </TableCell>
                <TableCell>
                  {formatDateTime(order.createdAt).dateOnly}
                </TableCell>
                <TableCell>
                  {order.status}
                </TableCell>
                <TableCell>
                  {/* Button for details and delete dialog */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrdersPage;

import { createReturn, getOrder } from "@/lib/api";
import type { Order, Return } from "@/lib/types";
import { sleep } from "workflow";

const CONSOLATION_DELAY = "10s"; // production: "2d"

export async function returnFlow(orderId: string, reason: string) {
    "use workflow";

    const order = await fetchOrder(orderId);

    // Returns immediately with a pending state
    const filed = await submitReturn(order, reason);

    // We're firing the return off and walking away. We don't yet know
    // whether it gets approved or rejected - we'll wire that up later.
    console.log(`[returnFlow] filed return ${filed.id} for order ${filed.orderId} — status: ${filed.status}`);

    await sleep(CONSOLATION_DELAY);
    await sendConsolationPromo(orderId);

    return { orderId, returnId: filed.id };
}

async function fetchOrder(orderId: string): Promise<Order> {
    "use step";
    return getOrder(orderId);
}

async function sendConsolationPromo(orderId: string): Promise<void> {
    "use step";
    // In production, we'd use an email provider
    console.log(
        `[returnFlow] 📧 sorry order ${orderId} didn't work out — here's COMEBACK10 for 10% off your next order.`,
    );
}

async function submitReturn(order: Order, reason: string): Promise<Return> {
    "use step";
    return createReturn({
        orderId: order.id,
        items: order.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
        })),
        reason,
    });
}
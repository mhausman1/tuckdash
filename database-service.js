import { ref, set, get, update, remove, query, orderByChild, push, startAt, endAt, limitToLast, equalTo, onValue } from "firebase/database";
import { db } from './firebase-config.js';

export const DatabaseService = {
    // Orders
    async createOrder(order) {
        // Generate a unique order number
        const orderNumberRef = ref(db, 'metadata/lastOrderNumber');
        const snapshot = await get(orderNumberRef);
        const lastNumber = snapshot.val() || 1000; // Start at 1000
        const newOrderNumber = lastNumber + 1;
        
        // Update the order with the new number
        order.orderNumber = newOrderNumber;
        order.id = `ORDER-${newOrderNumber}`;
        
        // Save the order
        const orderRef = ref(db, `orders/${order.id}`);
        await set(orderRef, {
            ...order,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Update the last order number
        await set(orderNumberRef, newOrderNumber);
        
        return order;
    },

    async getOrder(orderId) {
        const orderRef = ref(db, `orders/${orderId}`);
        const snapshot = await get(orderRef);
        return snapshot.val();
    },

    async getOrderByNumber(orderNumber) {
        const ordersRef = ref(db, 'orders');
        const orderQuery = query(ordersRef, orderByChild('orderNumber'), equalTo(orderNumber));
        const snapshot = await get(orderQuery);
        const orders = snapshot.val();
        return orders ? Object.values(orders)[0] : null;
    },

    async getAllOrders() {
        const ordersRef = ref(db, 'orders');
        const snapshot = await get(ordersRef);
        return snapshot.val() ? Object.values(snapshot.val()) : [];
    },

    async updateOrder(orderId, updates) {
        const updateData = {
            [`orders/${orderId}`]: {
                ...updates,
                updatedAt: new Date().toISOString()
            }
        };
        await update(ref(db), updateData);
    },

    // Real-time order updates
    onOrderUpdate(orderId, callback) {
        const orderRef = ref(db, `orders/${orderId}`);
        onValue(orderRef, (snapshot) => {
            callback(snapshot.val());
        });
    },

    // Get latest order number
    async getLatestOrderNumber() {
        const numberRef = ref(db, 'metadata/lastOrderNumber');
        const snapshot = await get(numberRef);
        return snapshot.val() || 1000;
    },

    async updateOrderStatus(orderId, status) {
        const updates = {};
        updates[`orders/${orderId}/status`] = status;
        await update(ref(db), updates);
    },


    async getDasherOrders(dasherId) {
        const ordersRef = ref(db, 'orders');
        const dasherQuery = query(ordersRef, orderByChild('dasherId'), equalTo(dasherId));
        const snapshot = await get(dasherQuery);
        return Object.values(snapshot.val() || {});
    },

    // Users
    async createUser(user) {
        const userRef = ref(db, `users/${user.id}`);
        await set(userRef, user);
    },

    async getUser(userId) {
        const userRef = ref(db, `users/${userId}`);
        const snapshot = await get(userRef);
        return snapshot.val();
    },

    // Chat
    async sendMessage(orderId, message) {
        const chatRef = ref(db, `chats/${orderId}`);
        const newMessageRef = push(chatRef);
        await set(newMessageRef, message);
    },

    async getOrderMessages(orderId) {
        const chatRef = ref(db, `chats/${orderId}`);
        const snapshot = await get(chatRef);
        return Object.values(snapshot.val() || {});
    },

    // Search functionality
    async searchOrders(params) {
        const { orderNumber, customerName, status, dateFrom, dateTo } = params;
        let orders = await this.getAllOrders();

        // Filter by order number
        if (orderNumber) {
            orders = orders.filter(order => 
                order.orderNumber.toString().includes(orderNumber.toString())
            );
        }

        // Filter by customer name
        if (customerName) {
            const searchTerm = customerName.toLowerCase();
            orders = orders.filter(order => 
                order.customer.name.toLowerCase().includes(searchTerm)
            );
        }

        // Filter by status
        if (status) {
            orders = orders.filter(order => order.status === status);
        }

        // Filter by date range
        if (dateFrom || dateTo) {
            orders = orders.filter(order => {
                const orderDate = new Date(order.createdAt);
                const isAfterFrom = !dateFrom || orderDate >= new Date(dateFrom);
                const isBeforeTo = !dateTo || orderDate <= new Date(dateTo);
                return isAfterFrom && isBeforeTo;
            });
        }

        return orders;
    },

    // Search by dorm
    async searchByDorm(dorm) {
        const ordersRef = ref(db, 'orders');
        const dormQuery = query(
            ordersRef, 
            orderByChild('customer/dorm'),
            startAt(dorm.toLowerCase()),
            endAt(dorm.toLowerCase() + '\uf8ff')
        );
        const snapshot = await get(dormQuery);
        return snapshot.val() ? Object.values(snapshot.val()) : [];
    },

    // Get orders by date range
    async getOrdersByDateRange(startDate, endDate) {
        const ordersRef = ref(db, 'orders');
        const dateQuery = query(
            ordersRef,
            orderByChild('createdAt'),
            startAt(startDate.toISOString()),
            endAt(endDate.toISOString())
        );
        const snapshot = await get(dateQuery);
        return snapshot.val() ? Object.values(snapshot.val()) : [];
    },

    // Get recent orders
    async getRecentOrders(limit = 10) {
        const ordersRef = ref(db, 'orders');
        const recentQuery = query(
            ordersRef,
            orderByChild('createdAt'),
            limitToLast(limit)
        );
        const snapshot = await get(recentQuery);
        return snapshot.val() ? Object.values(snapshot.val()).reverse() : [];
    }
}; 
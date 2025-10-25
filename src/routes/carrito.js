
const express = require('express');

module.exports = (pool) => {
    const router = express.Router();


    router.get('/', async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT producto_id AS id, nombre, precio, cantidad FROM carrito_items'
            );
            res.json(rows); // Devuelve los items (antes era 'cart')
        } catch (error) {
            console.error("Error al obtener carrito:", error);
            res.status(500).json({ mensaje: 'Error en el servidor' });
        }
    });


    router.post('/agregar', async (req, res) => {
        const { id, nombre, precio, cantidad } = req.body;

        if (!id || !nombre || !precio || !cantidad) {
            return res.status(400).json({ mensaje: 'Faltan datos (id, nombre, precio, cantidad)' });
        }

        try {

            const sql = `
                INSERT INTO carrito_items (producto_id, nombre, precio, cantidad)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE cantidad = cantidad + ?;
            `;

            await pool.query(sql, [id, nombre, precio, cantidad, cantidad]);

            const [cart] = await pool.query('SELECT producto_id AS id, nombre, precio, cantidad FROM carrito_items');
            res.json({ mensaje: 'Producto agregado al carrito', carrito: cart });

        } catch (error) {
            console.error("Error al agregar producto:", error);
            res.status(500).json({ mensaje: 'Error en el servidor' });
        }
    });


    router.delete('/eliminar/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);

            const [result] = await pool.query(
                'DELETE FROM carrito_items WHERE producto_id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ mensaje: 'Producto no encontrado en el carrito' });
            }

            const [cart] = await pool.query('SELECT producto_id AS id, nombre, precio, cantidad FROM carrito_items');
            res.json({ mensaje: 'Producto eliminado', carrito: cart });

        } catch (error) {
            console.error("Error al eliminar producto:", error);
            res.status(500).json({ mensaje: 'Error en el servidor' });
        }
    });


    router.get('/total', async (req, res) => {
        try {
            const sql = `
                SELECT 
                    producto_id AS id, 
                    nombre, 
                    precio AS precio_unitario, 
                    cantidad, 
                    (precio * cantidad) AS subtotal 
                FROM carrito_items
            `;
            const [detalles] = await pool.query(sql);

            const total = detalles.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

            res.json({
                total: total.toFixed(2),
                productos: detalles
            });

        } catch (error) {
            console.error("Error al obtener total:", error);
            res.status(500).json({ mensaje: 'Error en el servidor' });
        }
    });

    return router;
};
const express = require('express');

module.exports = (pool) => {
    const router = express.Router();


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

  
    router.post('/finalizar', async (req, res) => {
        const { productos } = req.body; 

        if (!Array.isArray(productos)) {
            return res.status(400).json({ mensaje: 'Datos no válidos. Se esperaba un array de productos.' });
        }
        
        for (const prod of productos) {
            if (prod.cantidad <= 0 || prod.precio <= 0) {
                return res.status(400).json({ mensaje: `Datos inválidos para ${prod.nombre}. Cantidad y precio deben ser positivos.`});
            }
        }

        try {
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            await connection.query('DELETE FROM carrito_items');

            if (productos.length > 0) {
                const values = productos.map(p => [p.id, p.nombre, p.precio, p.cantidad]);
                
                const sqlInsert = `
                    INSERT INTO carrito_items (producto_id, nombre, precio, cantidad) 
                    VALUES ?
                `;
                await connection.query(sqlInsert, [values]);
            }

            await connection.commit();
            connection.release();
            
            res.json({ mensaje: 'Compra finalizada y guardada en la base de datos.' });

        } catch (error) {
            console.error("Error al finalizar compra:", error);
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            res.status(500).json({ mensaje: 'Error en el servidor al guardar.' });
        }
    });

    router.get('/', async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT producto_id AS id, nombre, precio, cantidad FROM carrito_items'
            );
            res.json(rows);
        } catch (error) {
            console.error("Error al obtener carrito:", error);
            res.status(500).json({ mensaje: 'Error en el servidor' });
        }
    });

    return router;
};
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// conexión a MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'hera1999',
  database: 'distribuidora'
});

db.connect(err => {
  if (err) {
    console.log('Error conexión:', err);
  } else {
    console.log('Conectado a MySQL');
  }
});

// ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

app.post('/productos', (req, res) => {
 const {
  nombre,
  precio_fardo,
  precio_pallet,
  stock,
  unidades_por_fardo,
  fardos_por_pallet
} = req.body;

  const sql = `
    INSERT INTO productos
(
  nombre,
  precio_fardo,
  precio_pallet,
  stock,
  unidades_por_fardo,
  fardos_por_pallet
)
VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql,[
  nombre,
  precio_fardo,
  precio_pallet,
  stock,
  unidades_por_fardo,
  fardos_por_pallet
], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error al crear producto');
    }

    res.send('Producto creado correctamente');
  });
});
app.get('/productos', (req, res) => {
  const sql = 'SELECT * FROM productos WHERE activo = 1';

  db.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error al obtener productos');
    }

    res.json(results);
  });
});
app.put('/productos/stock', (req, res) => {

  const {
    producto_id,
    cantidad,
    tipo
  } = req.body;

  const sqlProducto = `
    SELECT
      unidades_por_fardo,
      fardos_por_pallet
    FROM productos
    WHERE id = ?
  `;

  db.query(sqlProducto, [producto_id], (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).send('Error producto');
    }

    const producto = result[0];

    let unidadesAgregar = 0;

    if (tipo === 'unidad') {

      unidadesAgregar = Number(cantidad);

    } else if (tipo === 'fardo') {

      unidadesAgregar =
        Number(cantidad) *
        producto.unidades_por_fardo;

    } else {

      unidadesAgregar =
        Number(cantidad) *
        producto.fardos_por_pallet *
        producto.unidades_por_fardo;
    }

    const sqlStock = `
      UPDATE productos
      SET stock = stock + ?
      WHERE id = ?
    `;

    db.query(sqlStock, [
      unidadesAgregar,
      producto_id
    ]);

    res.send('Stock agregado');
  });
});
app.put('/productos/:id', (req, res) => {

  console.log('PUT PRODUCTOS');

  const { id } = req.params;

  const {
    nombre,
    precio_fardo,
    precio_pallet,
    stock,
    unidades_por_fardo,
    fardos_por_pallet
  } = req.body;

  const sql = `
    UPDATE productos
    SET
      nombre = ?,
      precio_fardo = ?,
      precio_pallet = ?,
      stock = ?,
      unidades_por_fardo = ?,
      fardos_por_pallet = ?
    WHERE id = ?
  `;

  db.query(sql, [

    nombre,
    precio_fardo,
    precio_pallet,
    stock,
    unidades_por_fardo,
    fardos_por_pallet,
    id

  ], (err) => {

    if (err) {

      console.log(err);

      return res
        .status(500)
        .send('Error al editar producto');
    }

    res.send('Producto actualizado');
  });
});

app.delete('/productos/:id', (req, res) => {

  const { id } = req.params;

  const sql = `
    UPDATE productos
    SET activo = 0
    WHERE id = ?
  `;

  db.query(sql, [id], (err) => {

    if (err) {

      console.log(err);

      return res
        .status(500)
        .send('Error al eliminar producto');
    }

    res.send('Producto eliminado');
  });
});

app.put('/clientes/:id/pago', (req, res) => {
  const { id } = req.params;
  const { monto } = req.body;

  const sql = `
    UPDATE clientes 
    SET saldo = saldo - ?
    WHERE id = ?
  `;

  db.query(sql, [monto, id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error al registrar pago');
    }

    res.send('Pago registrado');
  });
});
app.post('/clientes/:id/pago', (req, res) => {
console.log(req.body);
  const { id } = req.params;

  const { monto } = req.body;

  const sqlCliente = `
    UPDATE clientes
    SET saldo = saldo + ?
    WHERE id = ?
  `;
console.log('ID:', id);
console.log('MONTO:', monto);
 db.query(sqlCliente, [monto, id], (err, result) => {
console.log('RESULTADO:', result);
    if (err) {

      console.log(err);

      return res
        .status(500)
        .send('Error actualizar saldo');
    }

    const sqlMovimiento = `
  INSERT INTO movimientos_clientes
  (
    cliente_id,
    tipo,
    monto,
    descripcion
  )
  VALUES (?, ?, ?, ?)
`;

    db.query(

      sqlMovimiento,

      [
  id,
  'pago',
  monto,
  'Pago registrado'
],

      (err2) => {

        if (err2) {

          console.log(err2);

          return res
            .status(500)
            .send('Error movimiento');
        }

        res.send('Pago registrado');
      }
    );
  });
});
app.post('/ventas', (req, res) => {
  const { cliente_id, productos } = req.body;

  let totalVenta = 0;

  const sqlVenta = 'INSERT INTO ventas (cliente_id, total) VALUES (?, 0)';

  db.query(sqlVenta, [cliente_id], (err, resultVenta) => {
    if (err) return res.status(500).send('Error al crear venta');

    const venta_id = resultVenta.insertId;

    productos.forEach((item) => {
      console.log('ITEM:', item);
     const {
  producto_id,
  cantidad,
  tipo_venta,
  paga,
  precio_venta
} = item;
      const sqlProducto = `
  SELECT 
  precio_fardo,
  precio_pallet,
  unidades_por_fardo,
  fardos_por_pallet,
  stock
FROM productos
WHERE id = ?
`;

      db.query(sqlProducto, [producto_id], (err, resultProducto) => {
        if (err) {

  console.log(err);

  return res
    .status(500)
    .send(err);
}

        const producto = resultProducto[0];

        const precio =
  precio_venta ??
  (
    tipo_venta === 'fardo'
      ? producto.precio_fardo
      : producto.precio_pallet
  );

const subtotal = precio * cantidad;
console.log({
  precio_venta,
  precio,
  cantidad,
  subtotal
});
        totalVenta += subtotal;
       let unidadesDescontar = 0;

if (tipo_venta === 'fardo') {

  unidadesDescontar =
    cantidad * producto.unidades_por_fardo;

} else {

  unidadesDescontar =
    cantidad *
    producto.fardos_por_pallet *
    producto.unidades_por_fardo;
}

// VALIDAR STOCK
if (producto.stock < unidadesDescontar) {

  if (!res.headersSent) {

    return res
      .status(400)
      .send('Stock insuficiente');
  }

  return;
}

        // guardar detalle
        const sqlDetalle = `
          INSERT INTO detalle_venta 
          (venta_id, producto_id, cantidad, precio_unitario, tipo_venta)
          VALUES (?, ?, ?, ?, ?)
        `;

      db.query(
  sqlDetalle,
  [
    venta_id,
    producto_id,
    cantidad,
    precio,
    tipo_venta
  ],
  (err) => {

    if (err) {

      console.log(err);

      return res
        .status(500)
        .send(err);
    }
  }
);

        // descontar stock
        const sqlStock = `
  UPDATE productos
  SET stock = stock - ?
  WHERE id = ?
`;

db.query(
  sqlStock,
  [
    unidadesDescontar,
    producto_id
  ],
  (err) => {

    if (err) {

      console.log(err);

      return res
        .status(500)
        .send(err);
    }
  }
);
// MANEJAR SALDO CLIENTE

if (!paga) {

  const sqlSaldo = `
    UPDATE clientes
    SET saldo = saldo - ?
    WHERE id = ?
  `;

  db.query(sqlSaldo, [
    subtotal,
    cliente_id
  ]);

};

// GUARDAR MOVIMIENTO

const sqlMovimiento = `
  INSERT INTO movimientos_clientes
  (
    cliente_id,
    tipo,
    monto,
    descripcion
  )
  VALUES (?, ?, ?, ?)
`;

const tipoMovimiento = !paga
  ? 'deuda'
  : 'pago';

const descripcion = !paga
  ? 'Venta fiada'
  : 'Pago realizado';

db.query(sqlMovimiento, [
  cliente_id,
  tipoMovimiento,
  subtotal,
  descripcion
]);
      });
    });

    // esperar un poco (simple, después mejoramos)
    setTimeout(() => {
      // actualizar total
      const sqlTotal = 'UPDATE ventas SET total = ? WHERE id = ?';
      db.query(sqlTotal, [totalVenta, venta_id]);
// MANEJAR SALDO CLIENTE

      if (!res.headersSent) {

  return res.send(
    'Venta completa registrada'
  );
}
    }, 500);
  });
});
app.get('/ventas', (req, res) => {

  const sql = `
    SELECT
      ventas.id,
      ventas.total,
      ventas.fecha,
      clientes.nombre AS cliente
    FROM ventas
    INNER JOIN clientes
      ON ventas.cliente_id = clientes.id
    ORDER BY ventas.fecha DESC
  `;

  db.query(sql, (err, results) => {

    if (err) {

      console.log(err);

      return res
        .status(500)
        .send('Error ventas');
    }

    res.json(results);
  });
});
app.get('/ventas/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT v.id, v.fecha, v.total, c.nombre AS cliente
    FROM ventas v
    JOIN clientes c ON v.cliente_id = c.id
    WHERE v.id = ?
  `;

  db.query(sql, [id], (err, ventaResult) => {
    if (err) return res.status(500).send('Error venta');

    const venta = ventaResult[0];

    const sqlDetalle = `
      SELECT p.nombre, d.cantidad, d.precio_unitario, d.tipo_venta
      FROM detalle_venta d
      JOIN productos p ON d.producto_id = p.id
      WHERE d.venta_id = ?
    `;

    db.query(sqlDetalle, [id], (err, detalleResult) => {
      if (err) return res.status(500).send('Error detalle');

      res.json({
        venta,
        productos: detalleResult
      });
    });
  });
});

app.get('/reportes/ventas-mes', (req, res) => {

  const sql = `
    SELECT 
      COUNT(*) AS cantidad_ventas,
      SUM(total) AS total_ventas
    FROM ventas
    WHERE MONTH(fecha) = MONTH(CURRENT_DATE())
    AND YEAR(fecha) = YEAR(CURRENT_DATE())
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error reporte');
    }

    res.json(result[0]);
  });
});
app.get('/dashboard', (req, res) => {

  const sqlVentas = `
    SELECT IFNULL(SUM(total), 0) AS totalVentas
    FROM ventas
  `;

  const sqlDeudas = `
    SELECT COUNT(*) AS clientesDeuda
    FROM clientes
    WHERE saldo < 0
  `;

  const sqlProductos = `
    SELECT COUNT(*) AS totalProductos
    FROM productos
    WHERE activo = 1
  `;

  const sqlStockBajo = `
    SELECT COUNT(*) AS stockBajo
    FROM productos
    WHERE stock <= 100
    AND activo = 1
  `;

  db.query(sqlVentas, (err, ventasResult) => {

    if (err) {

      console.log(err);

      return res.status(500).send(err);
    }

    db.query(sqlDeudas, (err2, deudaResult) => {

      if (err2) {

        console.log(err2);

        return res.status(500).send(err2);
      }

      db.query(sqlProductos, (err3, productosResult) => {

        if (err3) {

          console.log(err3);

          return res.status(500).send(err3);
        }

        db.query(sqlStockBajo, (err4, stockResult) => {

          if (err4) {

            console.log(err4);

            return res.status(500).send(err4);
          }

          res.json({

            ventas:
              ventasResult[0].totalVentas,

            deudores:
              deudaResult[0].clientesDeuda,

            productos:
              productosResult[0].totalProductos,

            stockBajo:
              stockResult[0].stockBajo
          });
        });
      });
    });
  });
});
app.post('/gastos', (req, res) => {
  const { descripcion, monto } = req.body;

  const sql = `
    INSERT INTO gastos (descripcion, monto)
    VALUES (?, ?)
  `;

  db.query(sql, [descripcion, monto], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error al guardar gasto');
    }

    res.send('Gasto registrado');
  });
});

app.post('/login', (req, res) => {

  const { usuario, password } = req.body;

  const sql = `
    SELECT * FROM usuarios
    WHERE usuario = ? AND password = ?
  `;

  db.query(sql, [usuario, password], (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).send('Error servidor');
    }

    if (result.length > 0) {
      res.json({
        mensaje: 'Login correcto'
      });
    } else {
      res.status(401).json({
        mensaje: 'Usuario o contraseña incorrectos'
      });
    }
  });
});
app.get('/clientes', (req, res) => {

  const sql = 'SELECT * FROM clientes WHERE activo = 1';

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).send('Error clientes');
    }

    res.json(result);
  });
});
app.delete('/clientes/:id', (req, res) => {

  const { id } = req.params;

  const sql = `
    UPDATE clientes
    SET activo = 0
    WHERE id = ?
  `;

  db.query(sql, [id], (err) => {

    if (err) {

      console.log(err);

      return res
        .status(500)
        .send('Error al eliminar cliente');
    }

    res.send('Cliente eliminado');
  });
});
app.get('/dashboard', (req, res) => {

  const sqlVentas = `
    SELECT IFNULL(SUM(total), 0) AS totalVentas
    FROM ventas
  `;

  const sqlGastos = `
    SELECT IFNULL(SUM(monto), 0) AS totalGastos
    FROM gastos
  `;

  const sqlProductos = `
    SELECT COUNT(*) AS totalProductos
    FROM productos
    WHERE activo = 1
  `;

  const sqlDeudores = `
    SELECT COUNT(*) AS totalDeudores
    FROM clientes
    WHERE saldo > 0
  `;

  db.query(sqlVentas, (err, ventasResult) => {

    if (err) return res.status(500).send(err);

    db.query(sqlGastos, (err, gastosResult) => {

      if (err) return res.status(500).send(err);

      db.query(sqlProductos, (err, productosResult) => {

        if (err) return res.status(500).send(err);

        db.query(sqlDeudores, (err, deudoresResult) => {

          if (err) return res.status(500).send(err);

          const totalVentas = ventasResult[0].totalVentas;
          const totalGastos = gastosResult[0].totalGastos;

          res.json({

            ventas: totalVentas,
            gastos: totalGastos,
            ganancias: totalVentas - totalGastos,
            productos: productosResult[0].totalProductos,
            deudores: deudoresResult[0].totalDeudores

          });
        });
      });
    });
  });
});
app.post('/clientes', (req, res) => {

  const {
    nombre,
    telefono
  } = req.body;

  const sql = `
    INSERT INTO clientes
    (nombre, telefono)
    VALUES (?, ?)
  `;

  db.query(sql, [nombre, telefono], (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).send('Error al crear cliente');
    }

    res.send('Cliente creado');
  });
});
app.get('/movimientos/:cliente_id', (req, res) => {

  const { cliente_id } = req.params;

  const sql = `
    SELECT *
    FROM movimientos_clientes
    WHERE cliente_id = ?
    ORDER BY fecha DESC
  `;

  db.query(sql, [cliente_id], (err, results) => {

    if (err) {

      console.log(err);

      return res.status(500).send('Error movimientos');
    }

    res.json(results);

  });
});
app.put('/productos/:id', (req, res) => {

  const { id } = req.params;

  const {
    nombre,
    precio_fardo,
    precio_pallet,
    stock,
    unidades_por_fardo,
    fardos_por_pallet
  } = req.body;

  const sql = `
    UPDATE productos
    SET
      nombre = ?,
      precio_fardo = ?,
      precio_pallet = ?,
      stock = ?,
      unidades_por_fardo = ?,
      fardos_por_pallet = ?
    WHERE id = ?
  `;

  db.query(sql, [

    nombre,
    precio_fardo,
    precio_pallet,
    stock,
    unidades_por_fardo,
    fardos_por_pallet,
    id

  ], (err) => {
  console.log(result);
    if (err) {

      console.log(err);

      return res
        .status(500)
        .send('Error al editar producto');
    }

    res.send('Producto actualizado');
  });
});
app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});
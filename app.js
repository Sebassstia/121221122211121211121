// Estado de la aplicación
let productos = JSON.parse(localStorage.getItem('productos')) || [];
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let categoriaActual = 'todos';

// Funciones de utilidad
function generarId() {
    return Math.random().toString(36).substr(2, 9);
}

function formatearPrecio(precio) {
    return `$${Number(precio).toFixed(2)}`;
}

function obtenerImagenAleatoria(nombre) {
    return `https://source.unsplash.com/400x300/?${encodeURIComponent(nombre)},vegetable`;
}

function guardarDatos() {
    localStorage.setItem('productos', JSON.stringify(productos));
    localStorage.setItem('clientes', JSON.stringify(clientes));
}

// Gestión de pestañas
function inicializarPestanas() {
    const botones = document.querySelectorAll('.nav-btn');
    const contenidos = document.querySelectorAll('.tab-content');

    botones.forEach(boton => {
        boton.addEventListener('click', () => {
            const pestana = boton.dataset.tab;
            
            botones.forEach(b => b.classList.remove('active'));
            contenidos.forEach(c => c.classList.remove('active'));
            
            boton.classList.add('active');
            document.getElementById(pestana).classList.add('active');
        });
    });
}

// Gestión de productos
function agregarProducto(evento) {
    evento.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const productoExistente = productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
    
    const producto = {
        id: productoExistente ? productoExistente.id : generarId(),
        nombre: nombre,
        categoria: document.getElementById('categoria').value,
        precio: Number(document.getElementById('precio').value),
        stock: Number(document.getElementById('stock').value),
        imagen: document.getElementById('imagen').value || obtenerImagenAleatoria(nombre)
    };

    if (productoExistente) {
        // Actualizar el producto y todas las referencias a su nombre en las compras
        productos = productos.map(p => p.id === producto.id ? producto : p);
        
        // Actualizar el nombre en las compras existentes
        clientes.forEach(cliente => {
            cliente.compras.forEach(compra => {
                if (compra.productoId === producto.id) {
                    compra.nombreProducto = producto.nombre;
                }
            });
        });
    } else {
        productos.push(producto);
    }

    guardarDatos();
    actualizarListaProductos();
    actualizarSelectProductos();
    actualizarReportes();
    evento.target.reset();
}

function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (producto) {
        document.getElementById('nombre').value = producto.nombre;
        document.getElementById('categoria').value = producto.categoria;
        document.getElementById('precio').value = producto.precio;
        document.getElementById('stock').value = producto.stock;
        document.getElementById('imagen').value = producto.imagen;
        
        // Cambiar a la pestaña de productos
        document.querySelector('[data-tab="productos"]').click();
        
        // Hacer scroll al formulario
        document.getElementById('productoForm').scrollIntoView({ behavior: 'smooth' });
    }
}

function eliminarProducto(id) {
    productos = productos.filter(p => p.id !== id);
    guardarDatos();
    actualizarListaProductos();
    actualizarSelectProductos();
    actualizarReportes();
}

// Funciones de exportación PDF
function exportarProductosPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Lista de Productos', 14, 20);

    const headers = [['Nombre', 'Categoría', 'Precio', 'Stock (kg)']];
    const data = productos.map(p => [
        p.nombre,
        p.categoria,
        formatearPrecio(p.precio),
        p.stock.toString()
    ]);

    doc.autoTable({
        head: headers,
        body: data,
        startY: 30,
        theme: 'grid'
    });

    doc.save('productos.pdf');
}

function exportarClientesPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Lista de Clientes y Compras', 14, 20);

    clientes.forEach((cliente, index) => {
        const startY = index === 0 ? 30 : doc.previousAutoTable.finalY + 15;
        
        doc.setFontSize(16);
        doc.text(`Cliente: ${cliente.nombre}`, 14, startY);

        const headers = [['Producto', 'Cantidad (kg)', 'Total', 'Fecha', 'Estado']];
        const data = cliente.compras.map(compra => [
            compra.nombreProducto,
            compra.cantidad.toString(),
            formatearPrecio(compra.total),
            new Date(compra.fecha).toLocaleDateString(),
            compra.entregado ? 'Entregado' : 'Pendiente'
        ]);

        doc.autoTable({
            head: headers,
            body: data,
            startY: startY + 10,
            theme: 'grid'
        });
    });

    doc.save('clientes.pdf');
}

function exportarReportesPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Reporte de Ventas', 14, 20);

    // Resumen general
    const ventasTotales = clientes.reduce((total, cliente) => 
        total + cliente.compras.reduce((sum, compra) => sum + compra.total, 0)
    , 0);

    doc.setFontSize(14);
    doc.text(`Ventas Totales: ${formatearPrecio(ventasTotales)}`, 14, 35);

    // Top productos
    const ventasProductos = productos.map(producto => ({
        producto,
        total: clientes.reduce((total, cliente) => 
            total + cliente.compras
                .filter(c => c.productoId === producto.id)
                .reduce((sum, compra) => sum + compra.total, 0)
        , 0)
    })).sort((a, b) => b.total - a.total);

    doc.text('Top 5 Productos', 14, 50);
    const headersProductos = [['Producto', 'Total Ventas']];
    const dataProductos = ventasProductos.slice(0, 5).map(({ producto, total }) => [
        producto.nombre,
        formatearPrecio(total)
    ]);

    doc.autoTable({
        head: headersProductos,
        body: dataProductos,
        startY: 55,
        theme: 'grid'
    });

    // Top clientes
    const ventasClientes = clientes.map(cliente => ({
        cliente,
        total: cliente.compras.reduce((sum, compra) => sum + compra.total, 0)
    })).sort((a, b) => b.total - a.total);

    doc.text('Top 5 Clientes', 14, doc.previousAutoTable.finalY + 15);
    const headersClientes = [['Cliente', 'Total Compras']];
    const dataClientes = ventasClientes.slice(0, 5).map(({ cliente, total }) => [
        cliente.nombre,
        formatearPrecio(total)
    ]);

    doc.autoTable({
        head: headersClientes,
        body: dataClientes,
        startY: doc.previousAutoTable.finalY + 20,
        theme: 'grid'
    });

    doc.save('reporte.pdf');
}

function actualizarListaProductos() {
    const contenedor = document.getElementById('listaProductos');
    const productosFiltrados = categoriaActual === 'todos' 
        ? productos 
        : productos.filter(p => p.categoria === categoriaActual);

    contenedor.innerHTML = productosFiltrados.map(producto => `
        <div class="producto-card">
            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen">
            <div class="producto-info">
                <h3 class="producto-nombre">${producto.nombre}</h3>
                <p class="producto-categoria">Categoría: ${producto.categoria}</p>
                <p class="producto-precio">${formatearPrecio(producto.precio)}</p>
                <div class="producto-acciones">
                    <p class="producto-stock">Stock: ${producto.stock} kg</p>
                    <div>
                        <button onclick="editarProducto('${producto.id}')" class="btn btn-primary">
                            <i class="icon-edit"></i>
                        </button>
                        <button onclick="eliminarProducto('${producto.id}')" class="btn btn-danger">
                            <i class="icon-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Gestión de clientes
function agregarCompra(evento) {
    evento.preventDefault();

    const nombre = document.getElementById('nombreCliente').value;
    const productoId = document.getElementById('productoId').value;
    const cantidad = Number(document.getElementById('cantidad').value);

    const producto = productos.find(p => p.id === productoId);
    if (!producto || producto.stock < cantidad) {
        alert('Stock insuficiente');
        return;
    }

    const compra = {
        id: generarId(),
        productoId,
        nombreProducto: producto.nombre,
        cantidad,
        fecha: new Date().toISOString(),
        total: producto.precio * cantidad,
        entregado: false
    };

    // Actualizar stock
    producto.stock -= cantidad;

    const clienteExistente = clientes.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (clienteExistente) {
        clienteExistente.compras.push(compra);
    } else {
        clientes.push({
            id: generarId(),
            nombre,
            compras: [compra]
        });
    }

    guardarDatos();
    actualizarListaClientes();
    actualizarListaProductos();
    actualizarReportes();
    evento.target.reset();
}

function eliminarCliente(id) {
    clientes = clientes.filter(c => c.id !== id);
    guardarDatos();
    actualizarListaClientes();
    actualizarListaProductos();
    actualizarReportes();
}

function eliminarCompra(clienteId, compraId) {
    const cliente = clientes.find(c => c.id === clienteId);
    cliente.compras = cliente.compras.filter(c => c.id !== compraId);
    
    if (cliente.compras.length === 0) {
        eliminarCliente(clienteId);
    } else {
        guardarDatos();
        actualizarListaClientes();
        actualizarListaProductos();
        actualizarReportes();
    }
}

function toggleEntregado(clienteId, compraId) {
    const cliente = clientes.find(c => c.id === clienteId);
    const compra = cliente.compras.find(c => c.id === compraId);
    
    compra.entregado = !compra.entregado;
    guardarDatos();
    actualizarListaClientes();
}

function actualizarListaClientes() {
    const contenedor = document.getElementById('listaClientes');
    contenedor.innerHTML = clientes.map(cliente => `
        <div class="cliente-card">
            <div class="cliente-header">
                <h3 class="cliente-nombre">${cliente.nombre}</h3>
                <button onclick="eliminarCliente('${cliente.id}')" class="btn btn-danger">
                    <i class="icon-trash"></i>
                </button>
            </div>
            <div class="tabla-container">
                <table class="tabla-compras">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad (kg)</th>
                            <th>Total</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cliente.compras.map(compra => `
                            <tr class="${compra.entregado ? 'entregado' : ''}">
                                <td>${compra.nombreProducto}</td>
                                <td>${compra.cantidad}</td>
                                <td>${formatearPrecio(compra.total)}</td>
                                <td>${new Date(compra.fecha).toLocaleDateString()}</td>
                                <td>
                                    <button 
                                        onclick="toggleEntregado('${cliente.id}', '${compra.id}')"
                                        class="btn ${compra.entregado ? 'btn-success' : 'btn-warning'}"
                                    >
                                        <i class="icon-${compra.entregado ? 'check' : 'clock'}"></i>
                                        ${compra.entregado ? 'Entregado' : 'Pendiente'}
                                    </button>
                                </td>
                                <td>
                                    <button onclick="eliminarCompra('${cliente.id}', '${compra.id}')" class="btn btn-danger">
                                        <i class="icon-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

// Gestión de reportes
function actualizarReportes() {
    // Ventas totales
    const ventasTotales = clientes.reduce((total, cliente) => 
        total + cliente.compras.reduce((sum, compra) => sum + compra.total, 0)
    , 0);
    document.getElementById('ventasTotales').textContent = formatearPrecio(ventasTotales);

    // Ventas por producto
    const ventasProductos = productos.map(producto => ({
        producto,
        total: clientes.reduce((total, cliente) => 
            total + cliente.compras
                .filter(c => c.productoId === producto.id)
                .reduce((sum, compra) => sum + compra.total, 0)
        , 0)
    })).sort((a, b) => b.total - a.total);

    // Producto más vendido
    if (ventasProductos.length > 0) {
        document.getElementById('productoTop').textContent = ventasProductos[0].producto.nombre;
        document.getElementById('productoTopVentas').textContent = formatearPrecio(ventasProductos[0].total);
    }

    // Ventas por cliente
    const ventasClientes = clientes.map(cliente => ({
        cliente,
        total: cliente.compras.reduce((sum, compra) => sum + compra.total, 0)
    })).sort((a, b) => b.total - a.total);

    // Cliente principal
    if (ventasClientes.length > 0) {
        document.getElementById('clienteTop').textContent = ventasClientes[0].cliente.nombre;
        document.getElementById('clienteTopCompras').textContent = formatearPrecio(ventasClientes[0].total);
    }

    // Top 5 productos
    document.getElementById('topProductos').innerHTML = ventasProductos
        .slice(0, 5)
        .map(({ producto, total }) => `
            <div class="reporte-item">
                <div class="reporte-item-info">
                    <img src="${producto.imagen}" alt="${producto.nombre}" class="reporte-item-imagen">
                    <span>${producto.nombre}</span>
                </div>
                <span class="reporte-item-valor">${formatearPrecio(total)}</span>
            </div>
        `).join('');

    // Top 5 clientes
    document.getElementById('topClientes').innerHTML = ventasClientes
        .slice(0, 5)
        .map(({ cliente, total }) => `
            <div class="reporte-item">
                <span>${cliente.nombre}</span>
                <span class="reporte-item-valor">${formatearPrecio(total)}</span>
            </div>
        `).join('');
}

// Actualizar select de productos
function actualizarSelectProductos() {
    const select = document.getElementById('productoId');
    select.innerHTML = `
        <option value="">Seleccionar producto</option>
        ${productos.map(p => `
            <option value="${p.id}">${p.nombre} (${formatearPrecio(p.precio)} - Stock: ${p.stock}kg)</option>
        `).join('')}
    `;
}

// Inicialización
function inicializar() {
    inicializarPestanas();

    // Event listeners
    document.getElementById('productoForm').addEventListener('submit', agregarProducto);
    document.getElementById('clienteForm').addEventListener('submit', agregarCompra);
    document.getElementById('filtroCategoria').addEventListener('change', (e) => {
        categoriaActual = e.target.value;
        actualizarListaProductos();
    });

    // Autocompletado para clientes
    const inputCliente = document.getElementById('nombreCliente');
    inputCliente.addEventListener('input', (e) => {
        const valor = e.target.value.toLowerCase();
        const sugerencias = clientes
            .filter(c => c.nombre.toLowerCase().includes(valor))
            .map(c => c.nombre);
        
        const listaSugerencias = document.getElementById('sugerenciasClientes');
        listaSugerencias.innerHTML = sugerencias
            .map(nombre => `<option value="${nombre}">`)
            .join('');
    });

    // Actualización inicial
    actualizarListaProductos();
    actualizarListaClientes();
    actualizarReportes();
    actualizarSelectProductos();
}

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', inicializar);
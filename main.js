/* ISC Copyright
Copyright 2023 MariseMiranda
*/
const serialport = require('serialport');
const mysql = require('mysql2');


const BD_CONFIG = {
    host: 'localhost',
    port: 3306,
    user: 'aluno',
    password: 'sptech',
    database: 'bd_SMFP',
}
const connection_bd = mysql.createConnection(BD_CONFIG);

const SERIAL_BAUD_RATE = 9600;
const fkSensor = 1;

const select_bd = ()=>{
    connection_bd.query("SELECT COUNT(valMetrica) AS 'quant' FROM tbMetricas;", function(err, rows) {
        if (err) throw(err);
        console.log("Quantidade de Valores: ",rows[0]['quant']);
    });
}

const get_arduino_data = async ()=>{
    const portas = await serialport.SerialPort.list();
    const portaArduino = portas.find((porta) => porta.vendorId == 2341 && porta.productId == 43);

    if (!portaArduino) {
        throw new Error('O arduino não foi encontrado em nenhuma porta serial');
    }

    const arduino = new serialport.SerialPort(
        {
            path: portaArduino.path,
            baudRate: SERIAL_BAUD_RATE
        }
    );

    arduino.on('open', () => {
        console.log(`A leitura do arduino foi iniciada na porta ${portaArduino.path} utilizando Baud Rate de ${SERIAL_BAUD_RATE}`);
    });

    arduino.pipe(new serialport.ReadlineParser({ delimiter: '\r\n' })).on('data', async (data) => {
        //LOOP

        var chave = Number(data); //1 ou 0

        if(chave == 1){
            await connection_bd.execute(
                'INSERT INTO tbMetricas (`fkSensor`, `valMetrica`) VALUES(?, ?)',
                [fkSensor, 1]
            );

            arduino.on('error', (mensagem) => {
                console.error(`Erro no arduino (Mensagem: ${mensagem}`)
                connection_bd.destroy();

            });

            select_bd();
        }

    });
    arduino.on('error', (mensagem) => {
        console.error(`Erro no arduino (Mensagem: ${mensagem}`)
        connection_bd.destroy();
    });
}

(async () => {
    select_bd();
    await get_arduino_data();
})();

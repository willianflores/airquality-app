// General funtions

    // Calculate the time elapsed since the last update

    function timeDifference(date1,date2){
        var difference = date1 - date2;

        var daysDifference = Math.floor(difference/1000/60/60/24);
        difference -= daysDifference*1000*60*60*24

        var hoursDifference = Math.floor(difference/1000/60/60);
        difference -= hoursDifference*1000*60*60

        var minutesDifference = Math.floor(difference/1000/60);
        difference -= minutesDifference*1000*60

        var secondsDifference = Math.floor(difference/1000);

        return(
            daysDifference + 'd ' +
            hoursDifference + 'h ' +
            minutesDifference + 'm ' +
            secondsDifference + 's ');
    }

    // Calculate elapsed time in days

        function daysDifference(date1,date2){
        var difference = date1 - date2;

        var daysDifference = Math.floor(difference/1000/60/60/24);
        
        return(
            daysDifference 
        );
    }

    // Apply LRAPA correction to PM2.5 values

    function correcPM25(pm25) {
        var LRAPApm25 = 0.5 * pm25 -0.66;

        return LRAPApm25;
    }

// Functions to export HTML table to CSV
function downloadCSVFile(csv, filename) {
    var csv_file, download_link;

    csv_file = new Blob([csv], {type: "text/csv"});

    download_link = document.createElement("a");

    download_link.download = filename;

    download_link.href = window.URL.createObjectURL(csv_file);

    download_link.style.display = "none";

    document.body.appendChild(download_link);

    download_link.click();
}

    document.getElementById("download-button").addEventListener("click", function () {
        var html = document.querySelector("table").outerHTML;
        htmlToCSV(html, "sensors_data.csv");
    });


    function htmlToCSV(html, filename) {
        var data = [];
        var rows = document.querySelectorAll("table tr");
                
        for (var i = 0; i < rows.length; i++) {
            var row = [], cols = rows[i].querySelectorAll("td, th");
                    
             for (var j = 0; j < cols.length; j++) {
                    row.push(cols[j].innerText);
                     }
                    
            data.push(row.join(","));		
        }

        //to remove table heading
        //data.shift()

        downloadCSVFile(data.join("\n"), filename);
    }


// Specific equations

    // Process data from PurpleAir sensors
    function dataProcess(pm25_10m,pm25_24h,last_seen,confidence,sensorCode) {   
        
        if (correcPM25(parseFloat(pm25_10m)) < 0) {
            $("#pm2510_"+sensorCode).html(0 + " \xB5g/m<sup>3</sup>");
        } else {
            $("#pm2510_"+sensorCode).html(correcPM25(parseFloat(pm25_10m)).toFixed(0) + " \xB5g/m<sup>3</sup>");
        }
    
        if (correcPM25(parseFloat(pm25_24h)) < 0) {
            $("#pm2524_"+sensorCode).html(0 + " \xB5g/m<sup>3</sup>");
        } else {
            $("#pm2524_"+sensorCode).html(correcPM25(parseFloat(pm25_24h)).toFixed(0) + " \xB5g/m<sup>3</sup>");
        }  
        
        $("#seen_"+sensorCode).html(new Date(last_seen * 1000).toLocaleDateString("pt-BR") + " " + new Date(last_seen * 1000).toLocaleTimeString("pt-BR"));
        $("#seenDays_"+sensorCode).html(timeDifference(Date.now(), last_seen*1000));
        $("#confid_"+sensorCode).html(parseInt(confidence) + "%");
    
    } 

    // Assign color to information icon

    function iColor(last_seen,confidence,sensorCode) {
    
        function daysDifference(date1,date2){
            var difference = date1 - date2;
      
            var daysDifference = Math.floor(difference/1000/60/60/24);
             
            return(
                daysDifference 
            );
        }
    
        if (daysDifference(Date.now(), last_seen*1000) > 2 || parseInt(confidence) <90) {
            document.getElementById("circle_i_"+sensorCode).style.color="red";
        } else {
            document.getElementById("circle_i_"+sensorCode).style.color="#4CBB17";
        }
    }

    // Add message about sensor A and B gauges working

    function falgDown(channel_flags,sensorCode) {

        if(channel_flags==0) {
            $("#flags_"+sensorCode).html("Normal")
        } else if (channel_flags==1) {
            $("#flags_"+sensorCode).html("Medidor A desativado")
        } else if (channel_flags==2) {
            $("#flags_"+sensorCode).html("Medidor B desativado")
        } else {
            $("#flags_"+sensorCode).html("Medidor A e B desativados")  
        }
    
    }

    // Assign a maintenance need message to the information icon depending on the variables

    function onmouseoverIcon(last_seen,confidence,sensorCode) {  
    
        if (daysDifference(Date.now(), last_seen*1000) > 2 && parseInt(confidence) >=90) {
            document.getElementById("circle_i_"+sensorCode).onmouseover = function () {
                document.getElementById("circle_i_"+sensorCode).setAttribute("data-content","Sensor com mais de 2 dias sem acesso a internet, verificar a rede wifi!");
            };
        } else if (daysDifference(Date.now(), last_seen*1000) <= 2 && parseInt(confidence) <90) {
            document.getElementById("circle_i_"+sensorCode).onmouseover = function () {
                document.getElementById("circle_i_"+sensorCode).setAttribute("data-content","A convergência das medidas dos medores A e B está abaixo de 90%, realizar limpeza do sensor!");
            };
        } else if (daysDifference(Date.now(), last_seen*1000) > 2 && parseInt(confidence) <90) {
            document.getElementById("circle_i_"+sensorCode).onmouseover = function () {
                document.getElementById("circle_i_"+sensorCode).setAttribute("data-content","Sensor com mais de 2 dias sem acesso a internet e com a convergência das medidas dos medores A e B abaixo de 90%, verificar a conexão de internet e realizar a limpeza do sensor!");
            };
        } else {
            
        }
    }

    // Function to get, process and populate the table with data from PurpleAir sensors

    function getSensorsData() {

        var fields = "confidence,channel_flags, last_seen,pm2.5_24hour,pm2.5_10minute,name"; 
        var show_only = "25891,25521,57177,31105,27841,31097,56663,31089,25501,31117,31101,25551,31111,25531,57171,57309,31107,25541,31099,25549,31115,25499,31103,31095,25503,31091,31109,56879,151650,13609";
        
        $.ajax({
            url: "https://api.purpleair.com/v1/sensors/"+"?fields="+fields+"&show_only="+show_only,
            type: "GET",
            dataType: "json",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-API-KEY", "43664AA0-305C-11ED-B5AA-42010A800006");
            }
        }).done(function(data) {

            // Porcess MPAC_ABR_01_promotoria sensor data
            dataProcess(data.data[19][5],data.data[19][6],data.data[19][1],data.data[19][4],"ABR1");
            iColor(data.data[19][1],data.data[19][4],"ABR1");
            falgDown(data.data[19][3],"ABR1");
            onmouseoverIcon(data.data[19][1],data.data[19][4],"ABR1");

            // Porcess MPAC_ABR_02_SEMSA sensor data
            dataProcess(data.data[5][5],data.data[5][6],data.data[5][1],data.data[5][4],"ABR2");
            iColor(data.data[5][1],data.data[5][4],"ABR2");
            falgDown(data.data[5][3],"ABR2");
            onmouseoverIcon(data.data[5][1],data.data[5][4],"ABR2");

            // Porcess MPAC_ACL_01_promotoria sensor data
            dataProcess(data.data[28][5],data.data[28][6],data.data[28][1],data.data[28][4],"ACL1");
            iColor(data.data[28][1],data.data[28][4],"ACL1");
            falgDown(data.data[28][3],"ACL1");
            onmouseoverIcon(data.data[28][1],data.data[28][4],"ACL1");

            // Porcess MPAC_BJR_01_promotoria sensor data
            dataProcess(data.data[10][5],data.data[10][6],data.data[10][1],data.data[10][4],"BJR1");
            iColor(data.data[10][1],data.data[10][4],"BJR1");
            falgDown(data.data[10][3],"BJR1");
            onmouseoverIcon(data.data[10][1],data.data[10][4],"BJR1");

            // Porcess MPAC_BRL_01_promotoria sensor data
            dataProcess(data.data[11][5],data.data[11][6],data.data[11][1],data.data[11][4],"BRL1");
            iColor(data.data[11][1],data.data[11][4],"BRL1");
            falgDown(data.data[11][3],"BRL1");
            onmouseoverIcon(data.data[11][1],data.data[11][4],"BRL1");

            // Porcess MPAC_BRL_02_radio fm 90.3 sensor data
            dataProcess(data.data[15][5],data.data[15][6],data.data[15][1],data.data[15][4],"BRL2");
            iColor(data.data[15][1],data.data[15][4],"BRL2");
            falgDown(data.data[15][3],"BRL2");
            onmouseoverIcon(data.data[15][1],data.data[15][4],"BRL2");

            // Porcess MPAC_CPX_01_qpm sensor data 
            dataProcess(data.data[25][5],data.data[25][6],data.data[25][1],data.data[25][4],"CPX1");
            iColor(data.data[25][1],data.data[25][4],"CPX1");
            falgDown(data.data[25][3],"CPX1");
            onmouseoverIcon(data.data[25][1],data.data[25][4],"CPX1");

            // Porcess MPAC_CZS_01_promotoria sensor data
            dataProcess(data.data[12][5],data.data[12][6],data.data[12][1],data.data[12][4],"CZS1");
            iColor(data.data[12][1],data.data[12][4],"CZS1");
            falgDown(data.data[12][3],"CZS1");
            onmouseoverIcon(data.data[12][1],data.data[12][4],"CZS1");

            // Funtions for MPAC_CZS_02_ciosp sensor data
            dataProcess(data.data[3][5],data.data[3][6],data.data[3][1],data.data[3][4],"CZS2");
            iColor(data.data[3][1],data.data[3][4],"CZS2");
            falgDown(data.data[3][3],"CZS2");
            onmouseoverIcon(data.data[3][1],data.data[3][4],"CZS2");

            // Funtions for MPAC_EPL_01_camara sensor data
            dataProcess(data.data[24][5],data.data[24][6],data.data[24][1],data.data[24][4],"EPL1");
            iColor(data.data[24][1],data.data[24][4],"EPL1");
            falgDown(data.data[24][3],"EPL1");
            onmouseoverIcon(data.data[24][1],data.data[24][4],"EPL1");

            // Funtions for MPAC_EPL_02_escola.joao.pedro sensor data
            dataProcess(data.data[17][5],data.data[17][6],data.data[17][1],data.data[17][4],"EPL2");
            iColor(data.data[17][1],data.data[17][4],"EPL2");
            falgDown(data.data[17][3],"EPL2");
            onmouseoverIcon(data.data[17][1],data.data[17][4],"EPL2");

            // Funtions for MPAC_FIJ_01_promotoria sensor data
            dataProcess(data.data[9][5],data.data[9][6],data.data[9][1],data.data[9][4],"FIJ1");
            iColor(data.data[9][1],data.data[9][4],"FIJ1");
            falgDown(data.data[9][3],"FIJ1");
            onmouseoverIcon(data.data[9][1],data.data[9][4],"FIJ1");

            // Funtions for MPAC_JRD_01_prefeitura sensor data
            dataProcess(data.data[22][5],data.data[22][6],data.data[22][1],data.data[22][4],"JRD1");
            iColor(data.data[22][1],data.data[22][4],"JRD1");
            falgDown(data.data[22][3],"JRD1");
            onmouseoverIcon(data.data[22][1],data.data[22][4],"JRD1");

            // Funtions for MPAC_MNL_01_promotoria sensor data
            dataProcess(data.data[6][5],data.data[6][6],data.data[6][1],data.data[6][4],"MNL1");
            iColor(data.data[6][1],data.data[6][4],"MNL1");
            falgDown(data.data[6][3],"MNL1");
            onmouseoverIcon(data.data[6][1],data.data[6][4],"MNL1");

            // Funtions for MPAC_MTH_01_semec sensor data
            dataProcess(data.data[27][5],data.data[27][6],data.data[27][1],data.data[27][4],"MTH1");
            iColor(data.data[27][1],data.data[27][4],"MTH1");
            falgDown(data.data[27][3],"MTH1");
            onmouseoverIcon(data.data[27][1],data.data[27][4],"MTH1");

            // Funtions for MPAC_MNU_01_Promotoria sensor data
            dataProcess(data.data[29][5],data.data[29][6],data.data[29][1],data.data[29][4],"MNU1");
            iColor(data.data[29][1],data.data[29][4],"MNU1");
            falgDown(data.data[29][3],"MNU1");
            onmouseoverIcon(data.data[29][1],data.data[29][4],"MNU1");

            // Funtions for MPAC_PLC_01_promotoria sensor data
            dataProcess(data.data[20][5],data.data[20][6],data.data[20][1],data.data[20][4],"PLC1");
            iColor(data.data[20][1],data.data[20][4],"PLC1");
            falgDown(data.data[20][3],"PLC1");
            onmouseoverIcon(data.data[20][1],data.data[20][4],"PLC1");

            // Funtions for MPAC_PTA_01_Sec.infraestruturaa sensor data
            dataProcess(data.data[7][5],data.data[7][6],data.data[7][1],data.data[7][4],"PTA1");
            iColor(data.data[7][1],data.data[7][4],"PTA1");
            falgDown(data.data[7][3],"PTA1");
            onmouseoverIcon(data.data[7][1],data.data[7][4],"PTA1");

            // Funtions for MPAC_PTW_01_prefeitura sensor data
            dataProcess(data.data[16][5],data.data[16][6],data.data[16][1],data.data[16][4],"PTW1");
            iColor(data.data[16][1],data.data[16][4],"PTW1");
            falgDown(data.data[16][3],"PTW1");
            onmouseoverIcon(data.data[16][1],data.data[16][4],"PTW1");

            // Funtions for MPAC_RBR sensor data
            dataProcess(data.data[8][5],data.data[8][6],data.data[8][1],data.data[8][4],"RBR1");
            iColor(data.data[8][1],data.data[8][4],"RBR1");
            falgDown(data.data[8][3],"RBR1");
            onmouseoverIcon(data.data[8][1],data.data[8][4],"RBR1");

            // Funtions for MPAC_RDA_01_prefeitura sensor data
            dataProcess(data.data[23][5],data.data[23][6],data.data[23][1],data.data[23][4],"RDA1");
            iColor(data.data[23][1],data.data[23][4],"RDA1");
            falgDown(data.data[23][3],"RDA1");
            onmouseoverIcon(data.data[23][1],data.data[23][4],"RDA1");

            // Funtions for MPAC_SNG_01_promotoria sensor data
            dataProcess(data.data[2][5],data.data[2][6],data.data[2][1],data.data[2][4],"SNG1");
            iColor(data.data[2][1],data.data[2][4],"SNG1");
            falgDown(data.data[2][3],"SNG1");
            onmouseoverIcon(data.data[2][1],data.data[2][4],"SNG1");

            // Funtions for MPAC_SNM_01_ifac sensor data
            dataProcess(data.data[18][5],data.data[18][6],data.data[18][1],data.data[18][4],"SNM1");
            iColor(data.data[18][1],data.data[18][4],"SNM1");
            falgDown(data.data[18][3],"SNM1");
            onmouseoverIcon(data.data[18][1],data.data[18][4],"SNM1");

            // Funtions for MPAC_SNM_02_promotoria sensor data
            dataProcess(data.data[14][5],data.data[14][6],data.data[14][1],data.data[14][4],"SNM2");
            iColor(data.data[14][1],data.data[14][4],"SNM2");
            falgDown(data.data[14][3],"SNM2");
            onmouseoverIcon(data.data[14][1],data.data[14][4],"SNM2");

            // Funtions for MPAC_SRP_01_prefeitura sensor data
            dataProcess(data.data[4][5],data.data[4][6],data.data[4][1],data.data[4][4],"SRP1");
            iColor(data.data[4][1],data.data[4][4],"SRP1");
            falgDown(data.data[4][3],"SRP1");
            onmouseoverIcon(data.data[4][1],data.data[4][4],"SRP1");

            // Funtions for MPAC_TRC_02_ifac sensor data
            dataProcess(data.data[13][5],data.data[13][6],data.data[13][1],data.data[13][4],"TRC2");
            iColor(data.data[13][1],data.data[13][4],"TRC2");
            falgDown(data.data[13][3],"TRC2");
            onmouseoverIcon(data.data[13][1],data.data[13][4],"TRC2");

            // Funtions for MPAC_XAP_01_bombeiro sensor data
            dataProcess(data.data[21][5],data.data[21][6],data.data[21][1],data.data[21][4],"XAP1");
            iColor(data.data[21][1],data.data[21][4],"XAP1");
            falgDown(data.data[21][3],"XAP1");
            onmouseoverIcon(data.data[21][1],data.data[21][4],"XAP1");

            // Funtions for MPAC_XAP_02_promotoria sensor data
            dataProcess(data.data[26][5],data.data[26][6],data.data[26][1],data.data[26][4],"XAP2");
            iColor(data.data[26][1],data.data[26][4],"XAP2");
            falgDown(data.data[26][3],"XAP2");
            onmouseoverIcon(data.data[26][1],data.data[26][4],"XAP2");

            // Funtions for AcreBioClima UFAC sensor data
            dataProcess(data.data[1][5],data.data[1][6],data.data[1][1],data.data[1][4],"UFAC1");
            iColor(data.data[1][1],data.data[1][4],"UFAC1");
            falgDown(data.data[1][3],"UFAC1");
            onmouseoverIcon(data.data[1][1],data.data[1][4],"UFAC1");

            // Funtions for UFACFloresta sensor data
            dataProcess(data.data[0][5],data.data[0][6],data.data[0][1],data.data[0][4],"UFAC2");
            iColor(data.data[0][1],data.data[0][4],"UFAC2");
            falgDown(data.data[0][3],"UFAC2");
            onmouseoverIcon(data.data[0][1],data.data[0][4],"UFAC2");

        }).fail(function() {
            console.log('Erro na requisição dos dados!');
        });

    }

getSensorsData();  
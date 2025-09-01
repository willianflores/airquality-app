<!DOCTYPE html>
<html lang="pt-br">

<head>
    <!-- Required meta tags -->
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" name="viewport" />
    <link rel="icon" type="image/png" href="./img/labgama-favicon.png">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
    <title>
        Qualidade do Ar no Acre
    </title>

    <!--     Fonts and icons     -->
    <link href="https://fonts.googleapis.com/css?family=Montserrat:400,700,200" rel="stylesheet" />
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css" />

    <!-- CSS Files -->
    <link href="./assets/css/bootstrap.min.css" rel="stylesheet" />
    <link href="./assets/css/paper-dashboard.css?v=2.1.0" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.9.1/font/bootstrap-icons.css">
    
    <!-- CSS Just for demo purpose, don't include it in your project -->
    <link href="./assets/demo/demo.css" rel="stylesheet" />

    <link rel="stylesheet" href="./css/style_m.css" />
    <link rel="stylesheet" href="./css/academicons.min.css" />

    <script src="./assets/js/core/jquery.min.js" type="text/javascript"></script>
               
</head>

<body class="">
    <div class="wrapper">
        <div class="sidebar " data-color="default"  data-active-color="danger">
            <div class="logo">
                <a href="#" class="simple-text logo-normal ">
                    <div class="logo-image-normal ">
                        <img src="./img/aq_acre_300x200.png">
                    </div>
                </a>
            </div>
            <div class="sidebar-wrapper">
                <ul class="nav ">
                    <li >
                        <a href="./index.php">
                            <i class="fa fa-home" style="font-size:28px;"></i>
                            <p style="font-size: 16px;">Home</p>
                        </a>
                    </li>
                    <li>
                        <a href="./graficos1.php">
                            <i class="fa fa-line-chart"></i>
                            <p>Gráficos Gerais</p>
                        </a>
                    </li>
                    <li>
                        <a href="./graficos2.php">
                            <i class="fa fa-area-chart"></i>
                            <p>Gráficos Municipais</p>
                        </a>
                    </li>
                    <li>
                        <a href="./mapas.php">
                            <i class="nc-icon nc-world-2"></i>
                            <p>Mapas</p>
                        </a>
                    </li>
                    <li class="active">
                        <a href="./manutencao.php">
                            <i class="nc-icon nc-settings"></i>
                            <p>Lista de Sensores</p>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
        <div class="main-panel">
            <!-- Navbar -->
            <nav class="navbar navbar-expand-lg navbar-absolute fixed-top navbar-transparent">
                <div class="container-fluid">
                    <div class="navbar-wrapper">
                        <div class="navbar-toggle">
                            <button type="button" class="navbar-toggler">
                                <span class="navbar-toggler-bar bar1"></span>
                                <span class="navbar-toggler-bar bar2"></span>
                                <span class="navbar-toggler-bar bar3"></span>
                            </button>
                        </div>
                        <a class="navbar-brand" href="javascript:;">Qualidade do Ar no Acre</a>
                    </div>
                </div>
            </nav>
            <!-- Content -->
            <div class="content">
                <div class="row">
                    <div class="col-md-12 padding-modify">
                        <div class="card ">
                            <div class="card-header ">
                                <h5 class="card-title">Lista de Sensores da Rede de Qualidade do Ar do Acre</h5>
                                <p class="card-category">Informações para Subsidiar Ações de Manutenção dos Sensores</p>
                            </div>
                            <div class="card-body ">
                                <table id="sensors-table" class="table table-hover">
                                    <thead>
                                        <tr class="text-center">
                                            <th scope="col">Nome</th>
                                            <th scope="col">Município</th>
                                            <th scope="col">PM2.5 (10min )</th>
                                            <th scope="col">PM2.5 (24horas )</th>
                                            <th scope="col">Data da Última Leitura </th>
                                            <th scope="col">Tempo da Última Leitura </th>
                                            <th scope="col">Funcionamento Medidores</th>
                                            <th scope="col">Convergência medidores A e B</th>                                            
                                            <th scope="col">Necessidade de Manutenção</th>
                                            <th scope="col">Localização do Sensor</th>
                                        </tr>
                                    </thead>
                                    <tbody style="font-size: 12px;">
                                        <tr>
                                            <th>MPAC_ABR_01_promotoria</th>
                                            <td>Assis Brasil</td>
                                            <td id="pm2510_ABR1" class="text-center"></td>
                                            <td id="pm2524_ABR1" class="text-center"></td>
                                            <td id="seen_ABR1" class="text-center"></td>
                                            <td id="seenDays_ABR1" class="text-center"></td>
                                            <td id="flags_ABR1" class="text-center"></td>                                            
                                            <td id="confid_ABR1" class="text-center"></td>
                                            <td id="nmanut_ABR1" class="text-center"><i id="circle_i_ABR1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31105#15.16/-10.938992/-69.567649" target="_blank" title="Promotoria de Justiça do MPAC, Assis Brasil, Acre"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_ABR_02_SEMSA</th>
                                            <td>Assis Brasil</td>
                                            <td id="pm2510_ABR2" class="text-center"></td>
                                            <td id="pm2524_ABR2" class="text-center"></td>
                                            <td id="seen_ABR2" class="text-center"></td>
                                            <td id="seenDays_ABR2" class="text-center"></td>
                                            <td id="flags_ABR2" class="text-center"></td>                                            
                                            <td id="confid_ABR2" class="text-center"></td>
                                            <td id="nmanut_ABR2" class="text-center"><i id="circle_i_ABR2" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25521#15.16/-10.938992/-69.567649" target="_blank" title="MPAC_ABR_01_SEMSA, Assis Brasil"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_ACL_01_promotoria</th>
                                            <td>Acrelândia</td>
                                            <td id="pm2510_ACL1" class="text-center"></td>
                                            <td id="pm2524_ACL1" class="text-center"></td>
                                            <td id="seen_ACL1" class="text-center"></td>
                                            <td id="seenDays_ACL1" class="text-center"></td>
                                            <td id="flags_ACL1" class="text-center"></td>                                            
                                            <td id="confid_ACL1" class="text-center"></td>
                                            <td id="nmanut_ACL1" class="text-center"><i id="circle_i_ACL1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=57177#10.79/-10.0319/-66.9649" target="_blank" title="MPAC_ACL_01_promotoria, Acrelândia"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_BJR_01_promotoria</th>
                                            <td>Bujari</td>
                                            <td id="pm2510_BJR1" class="text-center"></td>
                                            <td id="pm2524_BJR1" class="text-center"></td>
                                            <td id="seen_BJR1" class="text-center"></td>
                                            <td id="seenDays_BJR1" class="text-center"></td>
                                            <td id="flags_BJR1" class="text-center"></td>                                            
                                            <td id="confid_BJR1" class="text-center"></td>
                                            <td id="nmanut_BJR1" class="text-center"><i id="circle_i_BJR1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25891#13.91/-9.83118/-67.93685" target="_blank" title="MPAC_BJR_01_promotoria, Bujari"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_BRL_01_promotoria</th>
                                            <td>Brasiléia</td>
                                            <td id="pm2510_BRL1" class="text-center"></td>
                                            <td id="pm2524_BRL1" class="text-center"></td>
                                            <td id="seen_BRL1" class="text-center"></td>
                                            <td id="seenDays_BRL1" class="text-center"></td>
                                            <td id="flags_BRL1" class="text-center"></td>                                            
                                            <td id="confid_BRL1" class="text-center"></td>
                                            <td id="nmanut_BRL1" class="text-center"><i id="circle_i_BRL1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=27841#13.95/-11.01565/-68.7528" target="_blank" title="MPAC_BRL_01_promotoria, Brasiléia"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_BRL_02_radio fm 90.3</th>
                                            <td>Brasiléia</td>
                                            <td id="pm2510_BRL2" class="text-center"></td>
                                            <td id="pm2524_BRL2" class="text-center"></td>
                                            <td id="seen_BRL2" class="text-center"></td>
                                            <td id="seenDays_BRL2" class="text-center"></td>
                                            <td id="flags_BRL2" class="text-center"></td>                                            
                                            <td id="confid_BRL2" class="text-center"></td>
                                            <td id="nmanut_BRL2" class="text-center"><i id="circle_i_BRL2" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31097#14.42/-11.009/-68.74446" target="_blank" title="MPAC_BRL_02_radio fm 90.3, Brasiléia"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_CPX_01_qpm</th>
                                            <td>Capixaba</td>
                                            <td id="pm2510_CPX1" class="text-center"></td>
                                            <td id="pm2524_CPX1" class="text-center"></td>
                                            <td id="seen_CPX1" class="text-center"></td>
                                            <td id="seenDays_CPX1" class="text-center"></td>
                                            <td id="flags_CPX1" class="text-center"></td>                                            
                                            <td id="confid_CPX1" class="text-center"></td>
                                            <td id="nmanut_CPX1" class="text-center"><i id="circle_i_CPX1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=56663#10.31/-10.6478/-67.7949" target="_blank" title="MPAC_CPX_01_qpm, Capixaba"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_CZS_01_promotoria</th>
                                            <td>Cruzeiro do Sul</td>,
                                            <td id="pm2510_CZS1" class="text-center"></td>
                                            <td id="pm2524_CZS1" class="text-center"></td>
                                            <td id="seen_CZS1" class="text-center"></td>
                                            <td id="seenDays_CZS1" class="text-center"></td>
                                            <td id="flags_CZS1" class="text-center"></td>                                            
                                            <td id="confid_CZS1" class="text-center"></td>
                                            <td id="nmanut_CZS1" class="text-center"><i id="circle_i_CZS1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31089#11.95/-7.62017/-72.67404" target="_blank" title="MPAC_CZS_01_promotoria, Cruzeiro do Sul"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_CZS_02_ciosp</th>
                                            <td>Cruzeiro do Sul</td>
                                            <td id="pm2510_CZS2" class="text-center"></td>
                                            <td id="pm2524_CZS2" class="text-center"></td>
                                            <td id="seen_CZS2" class="text-center"></td>
                                            <td id="seenDays_CZS2" class="text-center"></td>
                                            <td id="flags_CZS2" class="text-center"></td>                                            
                                            <td id="confid_CZS2" class="text-center"></td>
                                            <td id="nmanut_CZS2" class="text-center"><i id="circle_i_CZS2" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25501#11.95/-7.62017/-72.67404" target="_blank" title="MPAC_CZS_02_ciosp, Cruzeiro do Sul"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_EPL_01_camara</th>
                                            <td>Epitaciolândia</td>
                                            <td id="pm2510_EPL1" class="text-center"></td>
                                            <td id="pm2524_EPL1" class="text-center"></td>
                                            <td id="seen_EPL1" class="text-center"></td>
                                            <td id="seenDays_EPL1" class="text-center"></td>
                                            <td id="flags_EPL1" class="text-center"></td>                                            
                                            <td id="confid_EPL1" class="text-center"></td>
                                            <td id="nmanut_EPL1" class="text-center"><i id="circle_i_EPL1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31117#14.02/-11.02959/-68.7468" target="_blank" title="MPAC_EPL_01_camara, Epitaciolândia"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_EPL_02_escola.joao.pedro</th>
                                            <td>Epitaciolândia</td>
                                            <td id="pm2510_EPL2" class="text-center"></td>
                                            <td id="pm2524_EPL2" class="text-center"></td>
                                            <td id="seen_EPL2" class="text-center"></td>
                                            <td id="seenDays_EPL2" class="text-center"></td>
                                            <td id="flags_EPL2" class="text-center"></td>                                            
                                            <td id="confid_EPL2" class="text-center"></td>
                                            <td id="nmanut_EPL2" class="text-center"><i id="circle_i_EPL2" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31101#14.02/-11.02959/-68.7468" target="_blank" title="MPAC_EPL_02_escola.joao.pedro, Epitaciolândia"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_FIJ_01_promotoria</th>
                                            <td>Feijó</td>
                                            <td id="pm2510_FIJ1" class="text-center"></td>
                                            <td id="pm2524_FIJ1" class="text-center"></td>
                                            <td id="seen_FIJ1" class="text-center"></td>
                                            <td id="seenDays_FIJ1" class="text-center"></td>
                                            <td id="flags_FIJ1" class="text-center"></td>                                            
                                            <td id="confid_FIJ1" class="text-center"></td>
                                            <td id="nmanut_FIJ1" class="text-center"><i id="circle_i_FIJ1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25551#12.55/-8.16301/-70.36083" target="_blank" title="MPAC_FIJ_01_promotoria, Feijó"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_JRD_01_prefeitura</th>
                                            <td>Jordão</td>
                                            <td id="pm2510_JRD1" class="text-center"></td>
                                            <td id="pm2524_JRD1" class="text-center"></td>
                                            <td id="seen_JRD1" class="text-center"></td>
                                            <td id="seenDays_JRD1" class="text-center"></td>
                                            <td id="flags_JRD1" class="text-center"></td>                                            
                                            <td id="confid_JRD1" class="text-center"></td>
                                            <td id="nmanut_JRD1" class="text-center"><i id="circle_i_JRD1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31111#6.28/-8.959/-67.555" target="_blank" title="MPAC_JRD_01_prefeitura, Jordão"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_MNL_01_promotoria</th>
                                            <td>Mâncio Lima</td>
                                            <td id="pm2510_MNL1" class="text-center"></td>
                                            <td id="pm2524_MNL1" class="text-center"></td>
                                            <td id="seen_MNL1" class="text-center"></td>
                                            <td id="seenDays_MNL1" class="text-center"></td>
                                            <td id="flags_MNL1" class="text-center"></td>                                            
                                            <td id="confid_MNL1" class="text-center"></td>
                                            <td id="nmanut_MNL1" class="text-center"><i id="circle_i_MNL1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25531#6.28/-8.959/-67.555" target="_blank" title="MPAC_MNL_01_promotoria, Mâncio Lima"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_MTH_01_semec</th>
                                            <td>Marechal Thaumaturgo</td>
                                            <td id="pm2510_MTH1" class="text-center"></td>
                                            <td id="pm2524_MTH1" class="text-center"></td>
                                            <td id="seen_MTH1" class="text-center"></td>
                                            <td id="seenDays_MTH1" class="text-center"></td>
                                            <td id="flags_MTH1" class="text-center"></td>                                            
                                            <td id="confid_MTH1" class="text-center"></td>
                                            <td id="nmanut_MTH1" class="text-center"><i id="circle_i_MTH1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=57171#6.28/-8.959/-67.555" target="_blank" title="MPAC_MTH_01_semec, Marechal Thaumaturgo"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_MNU_01_Promotoria</th>
                                            <td>Manoel Urbano</td>
                                            <td id="pm2510_MNU1" class="text-center"></td>
                                            <td id="pm2524_MNU1" class="text-center"></td>
                                            <td id="seen_MNU1" class="text-center"></td>
                                            <td id="seenDays_MNU1" class="text-center"></td>
                                            <td id="flags_MNU1" class="text-center"></td>                                            
                                            <td id="confid_MNU1" class="text-center"></td>
                                            <td id="nmanut_MNU1" class="text-center"><i id="circle_i_MNU1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=57309#6.28/-8.959/-67.555" target="_blank" title="MPAC_MNU_01_Promotoria, Manoel Urbano"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_PLC_01_promotoria</th>
                                            <td>Plácido de Castro</td>
                                            <td id="pm2510_PLC1" class="text-center"></td>
                                            <td id="pm2524_PLC1" class="text-center"></td>
                                            <td id="seen_PLC1" class="text-center"></td>
                                            <td id="seenDays_PLC1" class="text-center"></td>
                                            <td id="flags_PLC1" class="text-center"></td>                                            
                                            <td id="confid_PLC1" class="text-center"></td>
                                            <td id="nmanut_PLC1" class="text-center"><i id="circle_i_PLC1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31107#6.28/-8.959/-67.555" target="_blank" title="MPAC_PLC_01_promotoria, Plácido de Castro"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_PTA_01_Sec.infraestrutura</th>
                                            <td>Porto Acre</td>
                                            <td id="pm2510_PTA1" class="text-center"></td>
                                            <td id="pm2524_PTA1" class="text-center"></td>
                                            <td id="seen_PTA1" class="text-center"></td>
                                            <td id="seenDays_PTA1" class="text-center"></td>
                                            <td id="flags_PTA1" class="text-center"></td>                                            
                                            <td id="confid_PTA1" class="text-center"></td>
                                            <td id="nmanut_PTA1" class="text-center"><i id="circle_i_PTA1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25891#9.09/-9.8294/-67.8035" target="_blank" title="MPAC_PTA_01_Sec.infraestrutura, Porto Acre"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_PTW_01_prefeitura</th>
                                            <td>Porto Walter</td>
                                            <td id="pm2510_PTW1" class="text-center"></td>
                                            <td id="pm2524_PTW1" class="text-center"></td>
                                            <td id="seen_PTW1" class="text-center"></td>
                                            <td id="seenDays_PTW1" class="text-center"></td>
                                            <td id="flags_PTW1" class="text-center"></td>                                            
                                            <td id="confid_PTW1" class="text-center"></td>
                                            <td id="nmanut_PTW1" class="text-center"><i id="circle_i_PTW1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p0/cC4?select=31099#7.04/-9.352/-69.243" target="_blank" title="MPAC_PTW_01_prefeitura, Porto Walter"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_RBR</th>
                                            <td>Rio Branco</td>
                                            <td id="pm2510_RBR1" class="text-center"></td>
                                            <td id="pm2524_RBR1" class="text-center"></td>
                                            <td id="seen_RBR1" class="text-center"></td>
                                            <td id="seenDays_RBR1" class="text-center"></td>
                                            <td id="flags_RBR1" class="text-center"></td>                                            
                                            <td id="confid_RBR1" class="text-center"></td>
                                            <td id="nmanut_RBR1" class="text-center"><i id="circle_i_RBR1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25549#12.08/-9.94639/-67.86611" target="_blank" title="MPAC_RBR, Rio Branco"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_RDA_01_prefeitura</th>
                                            <td>Rodrigues Alves</td>
                                            <td id="pm2510_RDA1" class="text-center"></td>
                                            <td id="pm2524_RDA1" class="text-center"></td>
                                            <td id="seen_RDA1" class="text-center"></td>
                                            <td id="seenDays_RDA1" class="text-center"></td>
                                            <td id="flags_RDA1" class="text-center"></td>                                            
                                            <td id="confid_RDA1" class="text-center"></td>
                                            <td id="nmanut_RDA1" class="text-center"><i id="circle_i_RDA1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31115#8.35/-8.095/-72.566" target="_blank" title="MPAC_RDA_01_prefeitura, Rodrigues Alves"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_SNG_01_promotoria</th>
                                            <td>Senador Guiomard</td>
                                            <td id="pm2510_SNG1" class="text-center"></td>
                                            <td id="pm2524_SNG1" class="text-center"></td>
                                            <td id="seen_SNG1" class="text-center"></td>
                                            <td id="seenDays_SNG1" class="text-center"></td>
                                            <td id="flags_SNG1" class="text-center"></td>                                            
                                            <td id="confid_SNG1" class="text-center"></td>
                                            <td id="nmanut_SNG1" class="text-center"><i id="circle_i_SNG1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25499#9.6/-10.0047/-67.7712" target="_blank" title="MPAC_SNG_01_promotoria, Senador Guiomard"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_SNM_01_ifac</th>
                                            <td>Sena Madureira</td>
                                            <td id="pm2510_SNM1" class="text-center"></td>
                                            <td id="pm2524_SNM1" class="text-center"></td>
                                            <td id="seen_SNM1" class="text-center"></td>
                                            <td id="seenDays_SNM1" class="text-center"></td>
                                            <td id="flags_SNM1" class="text-center"></td>                                            
                                            <td id="confid_SNM1" class="text-center"></td>
                                            <td id="nmanut_SNM1" class="text-center"><i id="circle_i_SNM1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31103#12.15/-9.12354/-68.65895" target="_blank" title="MPAC_SNM_01_ifac, Sena Madureira"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_SNM_02_promotoria</th>
                                            <td>Sena Madureira</td>
                                            <td id="pm2510_SNM2" class="text-center"></td>
                                            <td id="pm2524_SNM2" class="text-center"></td>
                                            <td id="seen_SNM2" class="text-center"></td>
                                            <td id="seenDays_SNM2" class="text-center"></td>
                                            <td id="flags_SNM2" class="text-center"></td>                                            
                                            <td id="confid_SNM2" class="text-center"></td>
                                            <td id="nmanut_SNM2" class="text-center"><i id="circle_i_SNM2" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31095#12.15/-9.12354/-68.65895" target="_blank" title="MPAC_SNM_02_promotoria, Sena Madureira"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_SRP_01_prefeitura</th>
                                            <td>Senta Rosa do Purus</td>
                                            <td id="pm2510_SRP1" class="text-center"></td>
                                            <td id="pm2524_SRP1" class="text-center"></td>
                                            <td id="seen_SRP1" class="text-center"></td>
                                            <td id="seenDays_SRP1" class="text-center"></td>
                                            <td id="flags_SRP1" class="text-center"></td>                                            
                                            <td id="confid_SRP1" class="text-center"></td>
                                            <td id="nmanut_SRP1" class="text-center"><i id="circle_i_SRP1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25503#6.21/-8.898/-67.219" target="_blank" title="MPAC_SRP_01_prefeitura, Santa Rosa do Purus"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_TRC_02_ifac</th>
                                            <td>Tarauacá</td>
                                            <td id="pm2510_TRC2" class="text-center"></td>
                                            <td id="pm2524_TRC2" class="text-center"></td>
                                            <td id="seen_TRC2" class="text-center"></td>
                                            <td id="seenDays_TRC2" class="text-center"></td>
                                            <td id="flags_TRC2" class="text-center"></td>                                            
                                            <td id="confid_TRC2" class="text-center"></td>
                                            <td id="nmanut_TRC2" class="text-center"><i id="circle_i_TRC2" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31091#6.21/-8.898/-67.219" target="_blank" title="MPAC_TRC_02_ifac, Tarauacá"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_XAP_01_bombeiro</th>
                                            <td>Xapuri</td>
                                            <td id="pm2510_XAP1" class="text-center"></td>
                                            <td id="pm2524_XAP1" class="text-center"></td>
                                            <td id="seen_XAP1" class="text-center"></td>
                                            <td id="seenDays_XAP1" class="text-center"></td>
                                            <td id="flags_XAP1" class="text-center"></td>                                            
                                            <td id="confid_XAP1" class="text-center"></td>
                                            <td id="nmanut_XAP1" class="text-center"><i id="circle_i_XAP1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p0/cC4?select=31109#12.71/-10.67865/-68.4768" target="_blank" title="MPAC_XAP_01_bombeiro, Xapuri"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>MPAC_XAP_02_promotoria</th>
                                            <td>Xapuri</td>
                                            <td id="pm2510_XAP2" class="text-center"></td>
                                            <td id="pm2524_XAP2" class="text-center"></td>
                                            <td id="seen_XAP2" class="text-center"></td>
                                            <td id="seenDays_XAP2" class="text-center"></td>
                                            <td id="flags_XAP2" class="text-center"></td>                                            
                                            <td id="confid_XAP2" class="text-center"></td>
                                            <td id="nmanut_XAP2" class="text-center"><i id="circle_i_XAP2" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=56879#15.09/-10.65897/-68.49727" target="_blank" title="MPAC_XAP_02_promotoria, Xapuri"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>AcreBioClima UFAC</th>
                                            <td>Rio Branco</td>
                                            <td id="pm2510_UFAC1" class="text-center"></td>
                                            <td id="pm2524_UFAC1" class="text-center"></td>
                                            <td id="seen_UFAC1" class="text-center"></td>
                                            <td id="seenDays_UFAC1" class="text-center"></td>
                                            <td id="flags_UFAC1" class="text-center"></td>                                            
                                            <td id="confid_UFAC1" class="text-center"></td>
                                            <td id="nmanut_UFAC1" class="text-center"><i id="circle_i_UFAC1" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=151650#17.79/-9.957771/-67.869463" target="_blank" title="AcreBioClima UFAC, Rio Branco"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                        <tr>
                                            <th>UFACFloresta</th>
                                            <td>Cruzeiro do Sul</td>
                                            <td id="pm2510_UFAC2" class="text-center"></td>
                                            <td id="pm2524_UFAC2" class="text-center"></td>
                                            <td id="seen_UFAC2" class="text-center"></td>
                                            <td id="seenDays_UFAC2" class="text-center"></td>
                                            <td id="flags_UFAC2" class="text-center"></td>                                            
                                            <td id="confid_UFAC2" class="text-center"></td>
                                            <td id="nmanut_UFAC2" class="text-center"><i id="circle_i_UFAC2" class="bi bi-info-circle pop-me-over" data-toggle="popover" data-placement="bottom" style="font-size: 1.5rem;"></i></td>
                                            <td class="text-center"><a href="https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=13609#8.49/-7.7909/-73.238" target="_blank" title="UFACFloresta, Cruzeiro do Sul"><i class="bi bi-geo-alt-fill" style="font-size: 1.5rem;"></i></a></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="card-footer ">
                                <hr>
                                <button id="download-button" type="button" class="btn btn-primary"><i class="fa fa-download" style="font-size:20px;color:white"></i>&nbsp;&nbsp;&nbsp;Baixar CSV</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <footer class="footer footer-black  footer-white ">
                <hr>
                <div class="container-fluid">
                    <div class="row">
                        <div class="credits mx-auto">
                            <span class="copyright">
                                Copyright © <script>
                                    document.write(new Date().getFullYear())
                                </script> LabGAMA - Todos os direitos reservados
                            </span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    </div>
    <!--   Core JS Files   -->
    <script src="./assets/js/core/popper.min.js" type="text/javascript"></script>
    <script src="./assets/js/core/bootstrap.min.js" type="text/javascript"></script>
    <script src="./assets/js/plugins/perfect-scrollbar.jquery.min.js" type="text/javascript"></script>
    <script src="./assets/js/plugins/moment.min.js"></script>

    <!--  Plugin for Sweet Alert -->
    <script src="./assets/js/plugins/sweetalert2.min.js"></script>

    <!-- Forms Validations Plugin -->
    <script src="./assets/js/plugins/jquery.validate.min.js"></script>

    <!-- Plugin for the Wizard, full documentation here: https://github.com/VinceG/twitter-bootstrap-wizard -->
    <script src="./assets/js/plugins/jquery.bootstrap-wizard.js"></script>

    <!-- Plugin for Select, full documentation here: http://silviomoreto.github.io/bootstrap-select -->
    <script src="./assets/js/plugins/bootstrap-selectpicker.js" type="text/javascript"></script>

    <!--  Plugin for Switches, full documentation here: http://www.jque.re/plugins/version3/bootstrap.switch/ -->
    <script src="./assets/js/plugins/bootstrap-switch.js"></script>

    <!--  Plugin for the DateTimePicker, full documentation here: https://eonasdan.github.io/bootstrap-datetimepicker/ -->
    <script src="./assets/js/plugins/bootstrap-datetimepicker.js"></script>

    <!--  DataTables.net Plugin, full documentation here: https://datatables.net/    -->
    <script src="./assets/js/plugins/jquery.dataTables.min.js"></script>

    <!--	Plugin for Tags, full documentation here: https://github.com/bootstrap-tagsinput/bootstrap-tagsinputs  -->
    <script src="./assets/js/plugins/bootstrap-tagsinput.js"></script>

    <!-- Plugin for Fileupload, full documentation here: http://www.jasny.net/bootstrap/javascript/#fileinput -->
    <script src="./assets/js/plugins/jasny-bootstrap.min.js"></script>

    <!--  Full Calendar Plugin, full documentation here: https://github.com/fullcalendar/fullcalendar    -->
    <script src="./assets/js/plugins/fullcalendar.min.js"></script>

    <!-- Vector Map plugin, full documentation here: http://jvectormap.com/documentation/ -->
    <script src="./assets/js/plugins/jquery-jvectormap.js"></script>

    <!--  Plugin for the Bootstrap Table -->
    <script src="./assets/js/plugins/bootstrap-table.js"></script>

    <!--  Plugin for the Sliders, full documentation here: http://refreshless.com/nouislider/ -->
    <script src="./assets/js/plugins/nouislider.min.js" type="text/javascript"></script>

    <!-- Chart JS -->
    <script src="./assets/js/plugins/chartjs.min.js"></script>

    <!-- Notifications Plugin    -->
    <script src="./assets/js/plugins/bootstrap-notify.js"></script>

    <!-- Control Center for Paper Dashboard -->
    <script src="./assets/js/paper-dashboard.js" type="text/javascript"></script>

    <!-- Data sensors list -->
    <script src="./js/datasensors.js" type="text/javascript"></script>
</body>

</html>
import Link from "next/link";
import Image from "next/image";

import {FaInstagram, FaResearchgate, FaGithub, FaOrcid} from "react-icons/fa"
import {FaGoogleScholar} from "react-icons/fa6"
import { MdEmail } from "react-icons/md";
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";


export function Team () {
    return (
        <section className="bg-backgroundWhite py-10 md:py-12 px-6 md:px-8">
            <div className="pb-10 md:pb-12">
                <h2 className="text-center text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 ">
                    Equipe Envolvida na Iniciativa
                </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-6 md:gap-8 lg:gap-10 my-1">
                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl w-full sm:w-[280px] md:w-[240px] lg:w-[280px]">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src="/teamImg/willian-profile-grey-crop.jpg" alt="Foto do pesquisador Willian" width={250} height={250} />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                            WILLIAN FLORES
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Professor / Pesquisador</p>
                        <p className="m-0 p-0  text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">UFAC</p>
                    
                        <ul className="flex gap-2 my-6">
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-researchgate rounded-full">
                                <Link
                                href="https://www.researchgate.net/profile/Antonio-Melo-6"
                                target="_blank"
                                className=""
                                >
                                <FaResearchgate/>
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-googlescholar rounded-full">
                                <Link
                                href="https://scholar.google.com.br/citations?user=4RY3BmQAAAAJ&hl=pt-BR"
                                target="_blank"
                                className=""
                                >
                                <FaGoogleScholar/>
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-github rounded-full">
                                <Link href="https://github.com/willianflores" target="_blank" className="">
                                <FaGithub/>
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-instagram rounded-full">
                                <Link href="https://www.instagram.com/willianfloresac/" target="_blank" className="">
                                <FaInstagram/>
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-email rounded-full">
                                <Link href="mailto:willianflores@ufac.br" target="_blank" className="">
                                <MdEmail/>
                                </Link>
                            </li>
                        </ul> 

                        <div className="relative w-full flex justify-center">
                            <div className="inline-block align-middle h-[3px] w-[50px] bg-gradient-to-r from-[#6b02FF] to-[#985BEF]"></div>
                        </div>                 
                    </CardContent>                      
                </Card>

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl w-full sm:w-[280px]">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src="/teamImg/sonaira-silva-grey-crop.jpg" alt="Foto da pesquisadora Sonaira" width={250} height={250} />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                            SONAIRA SILVA
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Professora / Pesquisadora</p>
                        <p className="m-0 p-0  text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">UFAC</p>
                    
                        <ul className="flex gap-2 my-6">
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-researchgate rounded-full">
                                <Link
                                href="https://www.researchgate.net/profile/Sonaira-Silva"
                                target="_blank"
                                className=""
                                >
                                <FaResearchgate />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-googlescholar rounded-full">
                                <Link
                                href="https://scholar.google.com/citations?hl=pt-BR&user=PJ-kR6MAAAAJ"
                                target="_blank"
                                className=""
                                >
                                <FaGoogleScholar />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-orcid rounded-full">
                                <Link href="https://orcid.org/0000-0003-2177-4577" target="_blank" className="">
                                <FaOrcid />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-instagram rounded-full">
                                <Link href="https://www.instagram.com/sonaira.silva/" target="_blank" className="">
                                <FaInstagram />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-email rounded-full">
                                <Link href="mailto:sonaira.silva@ufac.br" target="_blank" className="">
                                <MdEmail />
                                </Link>
                            </li>
                        </ul> 

                        <div className="relative w-full flex justify-center">
                            <div className="inline-block align-middle h-[3px] w-[50px] bg-gradient-to-r from-[#6b02FF] to-[#985BEF]"></div>
                        </div>                 
                    </CardContent>                      
                </Card>
                
                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl w-full sm:w-[280px]">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src="/teamImg/liana-anderson-grey-crop.jpg" alt="Foto da pesquisadora Liana" width={250} height={250} />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                            LIANA ANDERSON
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Pesquisadora</p>
                        <p className="m-0 p-0  text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">INPE</p>
                    
                        <ul className="flex gap-2 my-6">
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-researchgate rounded-full">
                                <Link
                                href="https://www.researchgate.net/profile/Liana-Anderson"
                                target="_blank"
                                className=""
                                >
                                <FaResearchgate />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-googlescholar rounded-full">
                                <Link
                                href="https://scholar.google.com.br/citations?hl=pt-BR&user=mbUxhL8AAAAJ"
                                target="_blank"
                                className=""
                                >
                                <FaGoogleScholar />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-orcid rounded-full">
                                <Link href="https://orcid.org/0000-0001-9545-5136" target="_blank" className="">
                                <FaOrcid />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-instagram rounded-full">
                                <Link href="https://www.instagram.com/liana.o.anderson/" target="_blank" className="">
                                <FaInstagram />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-email rounded-full">
                                <Link href="mailto:liana.anderson@cemaden.gov.br" target="_blank" className="">
                                <MdEmail />
                                </Link>
                            </li>
                        </ul> 

                        <div className="relative w-full flex justify-center">
                            <div className="inline-block align-middle h-[3px] w-[50px] bg-gradient-to-r from-[#6b02FF] to-[#985BEF]"></div>
                        </div>                 
                    </CardContent>                      
                </Card>

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl w-full sm:w-[280px]">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src="/teamImg/foster-brown-grey-crop.jpg" alt="Foto do pesquisador Foster" width={250} height={250} />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                        FOSTER BROWN
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Pesquisador / Professor</p>
                        <p className="m-0 p-0  text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">WOODWELL - UFAC</p>
                    
                        <ul className="flex gap-2 my-6">
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-researchgate rounded-full">
                                <Link
                                href="https://www.researchgate.net/profile/Foster-Brown-2"
                                target="_blank"
                                className=""
                                >
                                <FaResearchgate />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-orcid rounded-full">
                                <Link href="https://orcid.org/0000-0003-1877-0866" target="_blank" className="">
                                <FaOrcid />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-instagram rounded-full">
                                <Link href="https://www.instagram.com/fosterbrown99/" target="_blank" className="">
                                <FaInstagram />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-email rounded-full">
                                <Link href="mailto:fbrown@woodwellclimate.org" target="_blank" className="">
                                <MdEmail />
                                </Link>
                            </li>
                        </ul> 

                        <div className="relative w-full flex justify-center">
                            <div className="inline-block align-middle h-[3px] w-[50px] bg-gradient-to-r from-[#6b02FF] to-[#985BEF]"></div>
                        </div>                 
                    </CardContent>                      
                </Card>

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl w-full sm:w-[280px]">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src="/teamImg/alejandro-duarte-grey-crop.jpg" alt="Foto do pesquisador Alejandro" width={250} height={250} />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                            ALEJANDRO DUARTE
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Professor / Pesquisador</p>
                        <p className="m-0 p-0  text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">UFAC</p>
                    
                        <ul className="flex gap-2 my-6">
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-googlescholar rounded-full">
                                <Link
                                href="http://lattes.cnpq.br/7579756540788697"
                                target="_blank"
                                className=""
                                >
                                <FaGoogleScholar />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-instagram rounded-full">
                                <Link href="https://www.instagram.com/alejj2018/" target="_blank" className="">
                                <FaInstagram />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-email rounded-full">
                                <Link href="mailto:alejandro.duarte@ufac.br" target="_blank" className="">
                                <MdEmail />
                                </Link>
                            </li>
                        </ul> 

                        <div className="relative w-full flex justify-center">
                            <div className="inline-block align-middle h-[3px] w-[50px] bg-gradient-to-r from-[#6b02FF] to-[#985BEF]"></div>
                        </div>                 
                    </CardContent>                      
                </Card>

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl w-full sm:w-[280px]">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src="/teamImg/dra_rita.png" alt="Foto do pesquisador Alejandro" width={250} height={250} />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                            RITA DE CASSIA LIMA
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Procuradora de Justiça</p>
                        <p className="m-0 p-0  text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">MPAC</p>
                    
                        <ul className="flex gap-2 my-6">
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-instagram rounded-full">
                                <Link href="https://www.instagram.com/rita.cassia.nogueira/" target="_blank" className="">
                                <FaInstagram />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-email rounded-full">
                                <Link href="mailto:rlima@mpac.mp.br" target="_blank" className="">
                                <MdEmail />
                                </Link>
                            </li>
                        </ul> 

                        <div className="relative w-full flex justify-center">
                            <div className="inline-block align-middle h-[3px] w-[50px] bg-gradient-to-r from-[#6b02FF] to-[#985BEF]"></div>
                        </div>                 
                    </CardContent>                      
                </Card>

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl w-full sm:w-[280px]">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src="/teamImg/dr_rolim.png" alt="Foto do pesquisador Alejandro" width={250} height={250} />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                            LUIS HENRIQUE ROLIM
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Promotor de Justiça</p>
                        <p className="m-0 p-0  text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">MPAC</p>
                    
                        <ul className="flex gap-2 my-6">
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-instagram rounded-full">
                                <Link href="https://www.instagram.com/luis_rolim72/" target="_blank" className="">
                                <FaInstagram />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-email rounded-full">
                                <Link href="mailto:lrolim@mpac.mp.br" target="_blank" className="">
                                <MdEmail />
                                </Link>
                            </li>
                        </ul> 

                        <div className="relative w-full flex justify-center">
                            <div className="inline-block align-middle h-[3px] w-[50px] bg-gradient-to-r from-[#6b02FF] to-[#985BEF]"></div>
                        </div>                 
                    </CardContent>                      
                </Card>

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl w-full sm:w-[280px]">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src="/teamImg/paulo_henrique.png" alt="Foto do pesquisador Alejandro" width={250} height={250} />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                            PAULO HENRIQUE SOUZA
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Analista Ministerial</p>
                        <p className="m-0 p-0  text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">MPAC</p>
                    
                        <ul className="flex gap-2 my-6">
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-instagram rounded-full">
                                <Link href="https://www.instagram.com/mpacre/?igsh=aDFtbnhvNWE5MzZm#" target="_blank" className="">
                                <FaInstagram />
                                </Link>
                            </li>
                            <li className="inline-block m-0 transition-all duration-300 ease-in-out p-[8px] w-[34px] h-[34px] text-[18px] leading-[18px] text-white bg-email rounded-full">
                                <Link href="mailto:psouza@mpac.mp.br" target="_blank" className="">
                                <MdEmail />
                                </Link>
                            </li>
                        </ul> 

                        <div className="relative w-full flex justify-center">
                            <div className="inline-block align-middle h-[3px] w-[50px] bg-gradient-to-r from-[#6b02FF] to-[#985BEF]"></div>
                        </div>                 
                    </CardContent>                      
                </Card>


            </div>

        </section>
    );
}


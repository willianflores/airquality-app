import Link from "next/link";
import Image from "next/image";

import willianPhoto from "/public/teamImg/willian-profile-grey-crop.jpg"
import sonairaPhoto from "/public/teamImg/sonaira-silva-grey-crop.jpg"
import lianaPhoto from "/public/teamImg/liana-anderson-grey-crop.jpg"
import fosterPhoto from "/public/teamImg/foster-brown-grey-crop.jpg"
import alaejandroPhoto from "/public/teamImg/alejandro-duarte-grey-crop.jpg"

import FaLattes from "/public/teamImg/lattes-square.svg"
import {FaInstagram, FaResearchgate, FaGithub, FaOrcid} from "react-icons/fa"
import {FaGoogleScholar} from "react-icons/fa6"
import { MdEmail } from "react-icons/md";
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";


export function Team () {
    return (
        <section className="bg-backgroundWhite py-10 px-6">
            <div className="pb-10">
                <h2 className="text-center text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 ">
                    Equipe de Pesquisadores Envolvidos na Iniciativa
                </h2>
            </div>

            <div className=" grid grid-cols-1 sm:grid-cols-5 gap-10 my-1">
                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src={ willianPhoto } alt="Foto do pesquisador Willian" />
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

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src={ sonairaPhoto } alt="Foto da pesquisadora Sonaira" />
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
                
                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src={ lianaPhoto } alt="Foto da pesquisadora Liana" />
                        <h3 className="mt-5 mx-0 text-zinc-800 text-lg font-bold uppercase transition-all duration-300 ease-in-out group-hover:text-white">
                            LIANA ANDERSON
                        </h3>
                        <p className="m-0 p-0 text-backgroundtextcolor italic transition-all duration-300 ease-in-out group-hover:text-white">Professora / Pesquisadora</p>
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

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src={ fosterPhoto } alt="Foto do pesquisador Foster" />
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

                <Card className="bg-backgroundGray transition duration-300 ease-in-out hover:bg-backgroundcard group shadow-2xl">
                    <CardContent className="my-5  py-[50px] px-[20px] flex flex-col items-center text-center ">
                        <Image className="rounded-full max-h-[250px] max-w-[250px] p-[5px] bg-backgroundWhite" src={ alaejandroPhoto } alt="Foto do pesquisador Alejandro" />
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


            </div>

        </section>
    );
}


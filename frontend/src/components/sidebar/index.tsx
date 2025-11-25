"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, VisuallyHidden } from "../ui/sheet";
import Image from "next/image";

import { Menu, ChartNoAxesCombined, ChartArea, Home, House, LibraryBig, Activity, Shield, Settings  } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Sidebar(){
    const [isOpen, setIsOpen] = useState(false);
    const { isAuthenticated, admin } = useAuth();

    // Função para fechar o sidebar ao navegar
    const handleNavigation = () => {
        setIsOpen(false);
    };

    return(
        <div className="flex w-full flex-col bg-muted/40">
            <aside className="fixed inset-y-0 left-0 z-10 w-56 hidden border-r bg-gradient-to-b from-gray-950 via-gray-900 to-gray-700 sm:flex">
                <nav className="flex flex-col gap-6 px-4 py-6 text-base">
                    <div className="border-b border-gray-600 pb-6 mb-2">
                        <Link href="/" className="flex items-center justify-center text-white hover:text-gray-200 transition-colors" prefetch={false}> 
                            <Image alt="Logo Acre Qualidade do Ar" src="/navbarLogo.png" height={120} width={120} className="transition-all hover:scale-105"/>
                            <span className="sr-only">Logo do Projeto</span>
                        </Link>
                    </div>

                    <Link href="/" className="flex gap-3 items-center rounded-lg px-3 py-2.5 text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                        <House className="h-5 w-5 flex-shrink-0"/>
                        <span className="font-medium">Home</span>
                    </Link>

                    <Link href="/graficosgerais" className="flex gap-3 items-center rounded-lg px-3 py-2.5 text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                        <ChartNoAxesCombined className="h-5 w-5 flex-shrink-0"/>
                        <span className="font-medium">Gráficos Gerais</span>
                    </Link>

                    <Link href="/graficosmunicipais" className="flex gap-3 items-center rounded-lg px-3 py-2.5 text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                        <ChartArea className="h-5 w-5 flex-shrink-0"/>
                        <span className="font-medium">Gráficos Municipais</span>
                    </Link>

                    <Link href="/relatoriosepublicacoes" className="flex gap-3 items-center rounded-lg px-3 py-2.5 text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                        <LibraryBig className="h-5 w-5 flex-shrink-0"/>
                        <span className="font-medium">Relatórios e Publicações</span>
                    </Link>

                    {/* Seção de Administração */}
                    <div className="border-t border-gray-600 pt-4 mt-4">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Administração
                        </div>
                    </div>

                    {isAuthenticated && admin ? (
                        <>
                            <Link href="/admin/sensores" className="flex gap-3 items-center rounded-lg px-3 py-2.5 text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                <Shield className="h-5 w-5 flex-shrink-0"/>
                                <span className="font-medium">Gestão Sensores</span>
                            </Link>

                            <Link href="/admin/sensores-monitoramento" className="flex gap-3 items-center rounded-lg px-3 py-2.5 text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                <Activity className="h-5 w-5 flex-shrink-0"/>
                                <span className="font-medium">Monitoramento Sensores</span>
                            </Link>

                            <Link href="/admin/configuracoes" className="flex gap-3 items-center rounded-lg px-3 py-2.5 text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                <Settings className="h-5 w-5 flex-shrink-0"/>
                                <span className="font-medium">Configurações</span>
                            </Link>
                        </>
                    ) : (
                        <Link href="/admin/login" className="flex gap-3 items-center rounded-lg px-3 py-2.5 text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                            <Shield className="h-5 w-5 flex-shrink-0"/>
                            <span className="font-medium">Login Admin</span>
                        </Link>
                    )}
                    
                </nav>
            </aside>

            <div className="sm:hidden flex flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center px-4 border-b bg-background gap-4">
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors">
                                <Menu className="h-6 w-6 text-gray-700"/>
                                <span className="sr-only">Abrir / Fechar Menu</span>                            
                        </SheetTrigger>

                        <SheetContent className="w-64 bg-gradient-to-b from-gray-950 to-gray-800 text-gray-200" side="left">
                            <VisuallyHidden>
                                <SheetTitle>Menu de Navegação</SheetTitle>
                            </VisuallyHidden>
                            <nav className="flex flex-col gap-6 pt-6">
                                <div className="border-b border-gray-600 pb-5 mb-2">
                                    <Link href="/" onClick={handleNavigation} className="flex items-center justify-center text-white hover:text-gray-200 transition-colors" prefetch={false}> 
                                        <Image alt="Logo Acre Qualidade do Ar" src="/navbarLogo.png" height={90} width={90} className="transition-all hover:scale-105"/>
                                        <span className="sr-only">Logo do Projeto</span>
                                    </Link>
                                </div>

                                <Link href="/" onClick={handleNavigation} className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                    <House className="h-5 w-5 flex-shrink-0"/>
                                    <span className="font-medium">Home</span>
                                </Link>

                                <Link href="/graficosgerais" onClick={handleNavigation} className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                    <ChartNoAxesCombined className="h-5 w-5 flex-shrink-0"/>
                                    <span className="font-medium">Gráficos Gerais</span>
                                </Link>

                                <Link href="/graficosmunicipais" onClick={handleNavigation} className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                    <ChartArea className="h-5 w-5 flex-shrink-0"/> 
                                    <span className="font-medium">Gráficos Municipais</span>
                                </Link>
                                
                                <Link href="/relatoriosepublicacoes" onClick={handleNavigation} className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                    <LibraryBig className="h-5 w-5 flex-shrink-0"/> 
                                    <span className="font-medium">Relatórios e Publicações</span>
                                </Link>

                                {/* Seção de Administração Mobile */}
                                <div className="border-t border-gray-600 pt-4 mt-4">
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Administração
                                    </div>
                                </div>

                                {isAuthenticated && admin ? (
                                    <>
                                        <Link href="/admin/sensores" onClick={handleNavigation} className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                            <Shield className="h-5 w-5 flex-shrink-0"/> 
                                            <span className="font-medium">Gestão Sensores</span>
                                        </Link>

                                        <Link href="/admin/sensores-monitoramento" onClick={handleNavigation} className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                            <Activity className="h-5 w-5 flex-shrink-0"/> 
                                            <span className="font-medium">Monitoramento Sensores</span>
                                        </Link>

                                        <Link href="/admin/configuracoes" onClick={handleNavigation} className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                            <Settings className="h-5 w-5 flex-shrink-0"/> 
                                            <span className="font-medium">Configurações</span>
                                        </Link>
                                    </>
                                ) : (
                                    <Link href="/admin/login" onClick={handleNavigation} className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-200 transition-all duration-200 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600" prefetch={false}> 
                                        <Shield className="h-5 w-5 flex-shrink-0"/> 
                                        <span className="font-medium">Login Admin</span>
                                    </Link>
                                )}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <h2 className="text-base font-medium text-gray-700">Menu</h2>
                </header>
            </div>
        </div>
    )
}
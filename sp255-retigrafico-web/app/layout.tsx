import"./globals.css";import Shell from"@/components/Shell";import{ExecutionProvider}from"@/components/ExecutionProvider";
export const metadata={title:"SP-255 | Retigráfico",description:"Val Rocha Engenharia - acompanhamento das frentes de serviço"};
export default function Layout({children}:{children:React.ReactNode}){return<html lang="pt-BR"><body><ExecutionProvider><Shell>{children}</Shell></ExecutionProvider></body></html>}

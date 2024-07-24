"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ModeToggle } from "@/components/mode-toggle";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Check, AlertCircle } from "lucide-react";
import Image from "next/image";

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

function formatExpiration(expires: number): string {
  if (!expires) return "No";

  const now = new Date();
  const expirationDate = new Date(expires * 1000);

  if (expirationDate <= now) return "Expirada";

  const diffTime = Math.abs(expirationDate.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Menos de un día";
  if (diffDays < 30) return `${diffDays} días`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`;
  return `${Math.floor(diffDays / 365)} años`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setCookies([]);
    setProgress(0);
    try {
      const response = await fetch("/api/getCookies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No se pudo obtener el lector de la respuesta");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.progress) {
              setProgress(data.progress);
            }
            if (data.cookies) {
              setCookies(data.cookies);
              setIsLoading(false);
            }
            if (data.error) {
              setMessage(data.error);
              setIsLoading(false);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error desconocido"
      );
      setIsLoading(false);
    }
  };

  const generateHtmlContent = (currentUrl: string) => {
    return `
      <table border="1">
        <caption>Lista de cookies para ${currentUrl}</caption>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Dominio</th>
            <th>Ruta</th>
            <th>Expira</th>
            <th>HttpOnly</th>
            <th>Seguro</th>
          </tr>
        </thead>
        <tbody>
          ${cookies
            .map(
              (cookie) => `
            <tr>
              <td>${cookie.name}</td>
              <td>${cookie.domain}</td>
              <td>${cookie.path}</td>
              <td>${formatExpiration(cookie.expires)}</td>
              <td>${cookie.httpOnly ? "Sí" : "No"}</td>
              <td>${cookie.secure ? "Sí" : "No"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  const exportToHtml = (currentUrl: string) => {
    const htmlContent = generateHtmlContent(currentUrl);
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cookie_table.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyHtmlToClipboard = (e: React.MouseEvent) => {
    e.preventDefault();
    const htmlContent = generateHtmlContent(url);
    navigator.clipboard
      .writeText(htmlContent)
      .then(() => {
        toast({
          title: "HTML copiado",
          description: "El contenido HTML ha sido copiado al portapapeles.",
        });
      })
      .catch((err) => {
        console.error("Error al copiar: ", err);
        toast({
          title: "Error al copiar",
          description: "No se pudo copiar el HTML al portapapeles.",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <main className="space-y-8">
        <div className="flex flex-col items-center md:flex-row md:justify-between md:items-center">
          <h1 className="text-4xl font-bold text-center md:text-left w-full md:w-auto flex items-center gap-3">
            <Image src="/cookie.png" alt="Cookies" width={35} height={35}/>Extractor de Cookies
          </h1>
          <div className="flex flex-col md:flex-row items-center mt-4 md:mt-0 gap-4">
            <span className="font-mono text-sm bg-gray-100 dark:bg-zinc-500 text-black dark:text-white p-2 rounded">
              &lt;coded by <a className="text-purple-300" target="_blank" href="https://aracovita.dev">aracovita.dev</a>/&gt;
            </span>
            <ModeToggle />
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2"
        >
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Ingrese una URL completa (ej: https://www.ejemplo.com)"
            required
            className="flex-grow"
          />
          <div className="flex space-x-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {isLoading ? "Cargando..." : "Ver Cookies"}
              </Button>
            </motion.div>
            <Button
              onClick={() => exportToHtml(url)}
              disabled={cookies.length === 0}
              className="w-full md:w-auto"
            >
              Exportar a HTML
            </Button>
            <Button
              onClick={copyHtmlToClipboard}
              disabled={cookies.length === 0}
              className="w-full md:w-auto"
            >
              Copiar HTML
            </Button>
          </div>
        </form>

        {isLoading && (
          <div className="w-full max-w-md mx-auto">
            <Progress
              value={progress}
              className="w-full [&>div]:bg-emerald-500"
            />
            <p className="text-center mt-2">{progress}% completado</p>
          </div>
        )}

        {message && (
          <Alert>
            <AlertTitle>Información</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {cookies.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>Lista de cookies para <a className="text-purple-300" target="_blank" href={url}>{url}</a></TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dominio</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>HttpOnly</TableHead>
                  <TableHead>Seguro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cookies.map((cookie, index) => (
                  <TableRow key={index}>
                    <TableCell>{cookie.name}</TableCell>
                    <TableCell>{cookie.domain}</TableCell>
                    <TableCell>{cookie.path}</TableCell>
                    <TableCell>{formatExpiration(cookie.expires)}</TableCell>
                    <TableCell>{cookie.httpOnly ? "Sí" : "No"}</TableCell>
                    <TableCell>{cookie.secure ? "Sí" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ModeToggle } from '@/components/mode-toggle';

interface Cookie {
  name: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    setCookies([])
    try {
      const response = await fetch('/api/getCookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
      
      const text = await response.text();
      console.log('Respuesta de la API:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Error al analizar la respuesta JSON: ${text}`);
      }

      if (response.ok) {
        if (data.cookies && Array.isArray(data.cookies)) {
          setCookies(data.cookies)
          if (data.cookies.length === 0) {
            setMessage(data.message || "No se encontraron cookies para esta URL.")
          }
        } else {
          throw new Error('Formato de respuesta inválido');
        }
      } else {
        throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  const exportToHtml = (currentUrl: string) => {
    let htmlContent = `
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
            <th>SameSite</th>
          </tr>
        </thead>
        <tbody>
    `;

    cookies.forEach(cookie => {
      htmlContent += `
        <tr>
          <td>${cookie.name}</td>
          <td>${cookie.domain}</td>
          <td>${cookie.path}</td>
          <td>${new Date(cookie.expires * 1000).toLocaleString()}</td>
          <td>${cookie.httpOnly ? 'Sí' : 'No'}</td>
          <td>${cookie.secure ? 'Sí' : 'No'}</td>
          <td>${cookie.sameSite}</td>
        </tr>
      `;
    });

    htmlContent += `
        </tbody>
      </table>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cookie_table.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <main className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Extractor de Cookies</h1>
          <div className='flex gap-4 items-center'>
          <span className="font-mono text-sm bg-gray-100 dark:bg-zinc-500 text-black dark:text-white p-2 rounded">
            &lt;coded by Adrián Racovita /&gt;
          </span>
            <ModeToggle />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Ingrese una URL completa (ej: https://www.ejemplo.com)"
            required
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Ver Cookies'}
          </Button>
          <Button onClick={() => exportToHtml(url)} disabled={cookies.length === 0}>
            Exportar a HTML
          </Button>
        </form>

        {message && (
          <Alert>
            <AlertTitle>Información</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {cookies.length > 0 && (
          <Table>
            <TableCaption>Lista de cookies para {url}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Dominio</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>HttpOnly</TableHead>
                <TableHead>Seguro</TableHead>
                <TableHead>SameSite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cookies.map((cookie, index) => (
                <TableRow key={index}>
                  <TableCell>{cookie.name}</TableCell>
                  <TableCell>{cookie.domain}</TableCell>
                  <TableCell>{cookie.path}</TableCell>
                  <TableCell>{new Date(cookie.expires * 1000).toLocaleString()}</TableCell>
                  <TableCell>{cookie.httpOnly ? 'Sí' : 'No'}</TableCell>
                  <TableCell>{cookie.secure ? 'Sí' : 'No'}</TableCell>
                  <TableCell>{cookie.sameSite}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    </div>
  )
}
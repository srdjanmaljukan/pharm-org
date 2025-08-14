"use client";

import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
    return ( <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="p-6 w-1/3 rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4">Greška</h1>
        <p className="text-destructive">Nepostojeća stranica.</p>
        <Button
          variant="outline"
          className="mt-4 ml-2"
          onClick={() => (window.location.href = "/")}
        >
          Nazad na početnu
        </Button>
      </div>
    </div> );
}
 
export default NotFoundPage;
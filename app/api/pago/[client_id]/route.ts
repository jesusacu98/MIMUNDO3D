import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ClientData {
  name: string;
  client_bank_accounts: {
    bank_name: string;
    interbank_clabe: string;
    account_holder_name: string;
    card_number: string | null;
  }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const { client_id } = await params;

    if (!client_id) {
      return NextResponse.json(
        { error: "El ID del cliente es requerido." },
        { status: 400 }
      );
    }

    // Query Supabase using the secure Admin Client
    const { data, error } = await (supabaseAdmin
      .from("clients")
      .select(`
        name,
        client_bank_accounts (
          bank_name,
          interbank_clabe,
          account_holder_name,
          card_number
        )
      `)
      .eq("id", client_id)
      .single() as any);

    const clientData = data as ClientData | null;
    const bankAccount = clientData?.client_bank_accounts?.[0];

    if (error || !clientData || !bankAccount) {
      console.error("Cliente o cuenta no encontrados en la consulta de API:", error || "No bank accounts found");
      return NextResponse.json(
        { error: "Cliente o cuenta bancaria no encontrados." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      clientName: clientData.name,
      bankAccount: {
        bank_name: bankAccount.bank_name,
        interbank_clabe: bankAccount.interbank_clabe,
        account_holder_name: bankAccount.account_holder_name,
        card_number: bankAccount.card_number,
      },
    });
  } catch (err: any) {
    console.error("Error del servidor en la API de pago:", err);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar la solicitud." },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

export default async function handler(req, res) {

    if (req.method !== "GET") {
        return res.status(405).json({
            ok: false,
            error: "Método no permitido"
        });
    }

    try {

        const authorization =
            req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {

            return res.status(401).json({
                ok: false,
                error: "No hay sesión."
            });

        }

        const token =
            authorization.substring(7).trim();

        const {
            data,
            error
        } = await supabase.auth.getUser(token);

        if (error || !data?.user) {

            return res.status(401).json({
                ok: false,
                error: "Sesión no válida."
            });

        }

        const usuario = data.user;

        return res.status(200).json({

            ok: true,

            usuario:
                usuario.user_metadata?.nombre ||
                usuario.email,

            email:
                usuario.email

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            error: "Error comprobando la sesión."
        });

    }
}
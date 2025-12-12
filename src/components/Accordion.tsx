import { useState } from "react";
import "./Accordion.css";

type AccordionProps = {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    subtitle?: string;
};

export default function Accordion({
    title,
    children,
    defaultOpen = false,
    subtitle,
}: AccordionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className={`accordion ${open ? "accordion-open" : ""}`}>
            <button
                type="button"
                className="accordion-header"
                onClick={() => setOpen(!open)}
            >
                <div className="accordion-header-left">
                    <span className="accordion-dot" />
                    <div className="accordion-title-block">
                        <h3 className="accordion-title">{title}</h3>
                        {subtitle && <p className="accordion-subtitle">{subtitle}</p>}
                    </div>
                </div>

                <span className="accordion-chevron">{open ? "▴" : "▾"}</span>
            </button>

            {open && <div className="accordion-content">{children}</div>}
        </section>
    );
}

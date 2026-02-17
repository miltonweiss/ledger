"use client";

import { toast } from "sonner"
export  function normalToast (title, description){
    return(
        
            toast(title, {
                position: "top-left",
                description: description,
                style: {
                  background: "var(--background-2)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  
                },
                classNames: {
                  toast: "toast-border-default",
                },
              })
            )
        }
      
        export  function redToast (title, description){
            return(
            toast(title, {
                position: "top-left",
                description: description,
                style: {
                  background: "var( --red-muted)",
                  color: "var( --red-accent)",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  
                },
                classNames: {
                  toast: "toast-border-red",
                },
              }))
        }
        export  function greenToast (title, description){
            return(
            toast(title, {
                position: "top-left",
                description: description,
                style: {
                  background: "var( --green-muted)",
                  color: "var( --green-accent)",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  
                },
                classNames: {
                  toast: "toast-border-green",
                },
              }))
        }
        export  function yellowToast (title, description){
            return(
            toast(title, {
                position: "top-left",
                description: description,
                style: {
                  background: "var( --yellow-muted)",
                  color: "var( --yellow-accent)",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  
                },
                classNames: {
                  toast: "toast-border-yellow",
                },
              }))
        }
        export  function purpleToast (title, description){
            return(
            toast(title, {
                position: "top-left",
                description: description,
                style: {
                  background: "var( --purple-muted)",
                  color: "var( --purple-accent)",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  
                },
                classNames: {
                  toast: "toast-border-purple",
                },
              }))}
              export function blueToast (title, description){
                return(
            toast(title, {
                position: "top-left",
                description: description,
                style: {
                  background: "var( --blue-muted)",
                  color: "var( --blue-accent)",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  
                },
                classNames: {
                  toast: "toast-border-blue",
                },
              }))
        }
        export function orangeToast (title, description){
            return(
            toast(title, {
                position: "top-left",
                description: description,
                style: {
                  background: "var( --orange-muted)",
                  color: "var( --orange-accent)",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  
                },
                classNames: {
                  toast: "toast-border-orange",
                },
              }))
        }
      
